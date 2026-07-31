import { system } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";

/*
MINE_LENGTH = 24;
MINE_LENGTH_AST = 12;
AISTATE_OFFLINE = -1;
AISTATE_STUCK = 0;
AISTATE_ATBASE = 1;
AISTATE_TRAVELLING = 2;
AISTATE_MINING = 3;
AISTATE_RETURNING = 4;
AISTATE_DOCKING = 5;
FAIL_BASEDESTROYED = 3;
FAIL_OUTOFENERGY = 4;
FAIL_RETURNPATHBLOCKED = 5;
FAIL_ANOTHERWASLINKED = 8;
*/

export default function(entity){
    let miner_data = load_dynamic_object(entity, "vehicle_data");
    let ai_state = miner_data.ai_state ?? 0;
    let tick_existed = miner_data.ticks ?? 0;
    let fail_messages = miner_data.fail_messages ?? 0;
    tick_existed++;

    console.warn(true)
    let rotation = entity.getRotation();
    if(rotation.y < 0) rotation.y += 360;
    rotation.y += 0.25;
    let velocity = entity.getVelocity();
    entity.applyImpulse({x: 0 - velocity.x, y: 0.1 - velocity.y, z: 0 - velocity.z})
    switch(ai_state) {
        case 0:
            if(tick_existed % 600 == 0){
                if(fail_messages & 8 > 0){

                }
            }else{
                ai_state = 4;
            }
            break;
        case value2:
            break;
    }
}

function move(entity){
    
}

function at_base(entity){
}