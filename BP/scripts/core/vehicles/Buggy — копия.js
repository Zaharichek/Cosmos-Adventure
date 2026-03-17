import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";

export default class{
    constructor(entity) {
        this.entity = entity;
        if (entity.isValid) this.buggy();
    }
    buggy(){
        let buggy = this.entity;

        let rider = buggy.getComponent("minecraft:rideable")?.getRiders()[0];
        if(!rider) return;
        let inventory = buggy.getComponent('minecraft:inventory');
        let container = inventory.container;

        let variables = load_dynamic_object(buggy, "vehicle_data")
        let speed = variables?.speed ?? 0;
        let time_climbing = variables?.time_climbing ?? 0;
        let fuel = variables?.fuel ?? 0;

        let rotation = buggy.getProperty("cosmos:rotation_y");
        let wheel_rotation = buggy.getProperty("cosmos:wheel_rotation_x");
        let info = rotate_buggy(speed, rotation, buggy.getProperty("cosmos:wheel_rotation_y"), rider.inputInfo.getMovementVector());
        speed = info.speed;
        speed *= 0.98;
        buggy.setProperty("cosmos:rotation_y", info.rotation);
        buggy.setProperty("cosmos:wheel_rotation_y", info.wheel_rotation);

        let motion = {x: 0, y: 0, z: 0};
        let velocity = buggy.getVelocity();
        let should_climb = false;
        let direction = {x: Math.cos((rotation + 90) / 57.2957795147), z: Math.sin((rotation + 90) / 57.2957795147)};
        if(fuel > 0){
            motion.x = -(speed * direction.x); 
            motion.z = -(speed * direction.z);
        }
        wheel_rotation += Math.sqrt(motion.x * motion.x + motion.z * motion.z) * 150 * (speed < 0 ? -1 : 1);
        if(wheel_rotation > 360) wheel_rotation = wheel_rotation % 360;
        else if(wheel_rotation < 0) wheel_rotation = 360 - (Math.abs(wheel_rotation) % 360);
        buggy.setProperty("cosmos:wheel_rotation_x", wheel_rotation);

        if(fuel > 0 && Math.abs(motion.x * motion.z) > 0.0001){
            const sqrt_motion = motion.x * motion.x + motion.z * motion.z;
            if(sqrt_motion !== 0 && system.currentTick % (Math.floor(4 / sqrt_motion) + 1) === 0) fuel = Math.max(0, fuel - 1)
        }
        if(speed > 0.8) speed = 0.8;
        if(speed > 0.001 || speed < 0.001) should_climb = true;
        if(should_climb){
            let collided_horizontally = buggy.dimension.getBlockFromRay(buggy.location, {x: -direction.x, y: 0, z: -direction.z}, {maxDistance: 2.5})?.block;
            if(collided_horizontally && !collided_horizontally.isAir && collided_horizontally.typeId !== "cosmos:buggy_fueling_pad"){
                speed *= 0.9;
                motion.y = 0.15 * ((-Math.pow((time_climbing) - 1, 2)) / 250.0) + 0.15;
                motion.y = Math.max(-0.15, motion.y);
            }
        }
        if(((motion.x > 0.001 || motion.x < 0.001) || (motion.z > 0.001 || motion.z < 0.001)) && !buggy.isOnGround) time_climbing += 1
        else{
            time_climbing = 0;
        }
        motion.x -= velocity.x;
        motion.z -= velocity.z;
        if(motion.y >= 0) buggy.applyImpulse(motion);

        if(system.currentTick % 10 === 0){
             container.add_ui_display(inventory.inventorySize - 2, 'Fuel Tank. Requires\nfuel loader to fill', Math.ceil((Math.ceil(fuel/26))))
             container.add_ui_display(inventory.inventorySize - 1, "§2" + `${Math.round(fuel * 100/1000)}` + '.0%% full')
        }

        save_dynamic_object(buggy, {speed, time_climbing, fuel}, "vehicle_data");
    }
}

function rotate_buggy(speed, rotation, wheel_rotation, input){
    speed += input.y * 0.4/20;
    rotation -= input.x * 3.5;
    if(rotation > 360) rotation = 0;
    else if(rotation < 0) rotation = 360;
    if(input.x > 0) wheel_rotation = Math.max(-30, Math.min(30, wheel_rotation + 0.5));
    else if(input.x < 0) wheel_rotation = Math.max(-30, Math.min(30, wheel_rotation - 0.5));
    wheel_rotation = Math.max(-30, Math.min(30, wheel_rotation * 0.9));
    return {rotation, speed, wheel_rotation}
}

