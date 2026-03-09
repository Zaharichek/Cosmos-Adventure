import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";

export default class{
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        if (entity.isValid) this.buggy();
    }
    buggy(){
        let buggy = this.entity;
        let inventory = buggy.getComponent('minecraft:inventory');
        //let container = inventory.container;

        let rider = buggy.getComponent("minecraft:rideable")?.getRiders()[0];
        if(!rider) return;

        let variables = load_dynamic_object(buggy, "vehicle_data")
        let speed = variables?.speed ?? 0;
        let time_climbing = variables?.time_climbing ?? 0;

        let rotation = buggy.getProperty("cosmos:rotation_y");
        let wheel_rotation = buggy.getProperty("cosmos:wheel_rotation_x");
        let info = rotate_buggy(speed, rotation, wheel_rotation, rider.inputInfo.getMovementVector());
        speed = info.speed;
        speed *= 0.98;
        buggy.setProperty("cosmos:rotation_y", info.rotation);

        let motion = {x: 0, y: 0, z: 0};
        let velocity = buggy.getVelocity();
        let should_climb = false;
        motion.x = (speed * Math.cos((rotation + 90) / 57.2957795147)); 
        motion.z = -(speed * Math.sin((rotation + 90) / 57.2957795147));
        wheel_rotation += Math.sqrt(motion.x * motion.x + motion.z * motion.z) * 150 * (speed < 0 ? -1 : 1);
        if(wheel_rotation > 360) wheel_rotation = 0;
        else if(wheel_rotation < 0) wheel_rotation = 360;
        buggy.setProperty("cosmos:wheel_rotation_x", wheel_rotation);

        motion.x -= velocity.x;
        motion.z -= velocity.z;
        if(speed > 0.5) speed = 0.5;
        if(speed > 0.001 || speed.y < 0.001) should_climb = true;
        let collided_horizontally = buggy.dimension.getBlock({x: buggy.location.x + Math.cos((rotation + 90) / 57.2957795147), y: buggy.location.y, z: buggy.location.z + -Math.sin((rotation + 90) / 57.2957795147)});
        if(should_climb && !collided_horizontally.isAir){
            speed *= 0.9;
            motion.y = 0.15 * ((-Math.pow((time_climbing) - 1, 2)) / 250.0) + 0.30;
        }
        if(((motion.x > 0.001 || motion.x < 0.001) || (motion.z > 0.001 || motion.z < 0.001)) && !buggy.isOnGround) time_climbing += 1
        else time_climbing = 0;
        motion.y -= velocity.y;
        buggy.applyImpulse(motion);
        save_dynamic_object(buggy, {speed, time_climbing}, "vehicle_data");
    }
}

function rotate_buggy(speed, rotation, wheel_rotation, input){
    speed += input.y * 0.2/20;
    rotation += input.x * 3;
    if(rotation > 360) rotation = 0;
    else if(rotation < 0) rotation = 360;
    return {rotation, speed}
}

