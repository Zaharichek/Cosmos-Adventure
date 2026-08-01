import { system, world } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";
import { vehicles } from "./Vehicle";

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
    let base_id = miner_data.base_id;
    let base_pos = miner_data.base_pos;

    tick_existed++;
    let rotation = entity.getRotation();
    if(rotation.y < 0) rotation.y += 360;
    rotation.y += 0.25;
    let velocity = entity.getVelocity();

    let base = base_id ? world.getEntity(miner_data.base_id) : undefined;

    let target_points = load_dynamic_object(entity, "vehicle_data", "target_points");
    console.warn(JSON.stringify(target_points))
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

function at_base(miner, base, position){
    if(!base) base = miner.dimension.getEntities({ type: "cosmos:astro_miner_base", location: {position}, maxDistance: 0.5, })[0];
    
}