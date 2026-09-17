import { system, world, BlockPermutation } from "@minecraft/server"
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

const facing_yaw = {north: 180, south: 0, west: 270, east: 90};

const unbreakable_blocks = [
    "minecraft:water", "minecraft:lava", "minecraft:bedrock", "minecraft:end_portal", "minecraft:end_frame",
    "minecraft:portal", "minecraft:rail", "minecraft:farmland", "minecraft:lever", "minecraft:redstone_wire",
    "minecraft:stonebrick", "minecraft:mossy_cobblestone", "cosmos:walkway", "cosmos:astro_miner_base"
];
export default function(entity){
    let info = load_dynamic_object(entity, "vehicle_data");
    info.ai_facing = info.ai_facing ?? "north";
    info.last_facing = info.last_facing ?? undefined;


    let rotation = {x: entity.getProperty("cosmos:rotation_x"), y: entity.getRotation().y}

    rotation.y = (rotation.y < 0)? rotation.y + 360: rotation.y;
    rotation.y = 360 - rotation.y;

    if(info.ai_facing != info.last_facing){
        info.ai_facing = info.last_facing;
        broke_blocks(entity, 0, info.ai_facing);
        broke_blocks(entity, 1, info.ai_facing);
        broke_blocks(entity, 2, info.ai_facing);
    }

    switch(info.ai_state) {
        case 2:
            break;
    }

    save_dynamic_object(entity, info, "vehicle_data")
}

function at_base(info){
    
}
function freeze(fail, info){
    info.ai_state = 0;
    info.velocity = {x: 0, y: 0, z: 0};
    if(info.fail_message & (1 << fail) == 0){
        info.fail_message += (1 << fail);
    }
}

function broke_blocks(miner, dist, ai_face, limit, info){
    if(info.mine_count_down > 0){
        info.mine_count_down -= 1;
        return false;
    }

    const headings2 = {down: {x: 0, y: -3, z: 0}, up: {x: 0, y: 2, z: 0}, 
    south: {x: 0, y: 0, z: -3}, north: {x: 0, y: 0, z: 2}, east: {x: 2, y: 0, z: 0}, west: {x: -3, y: 0, z: 0}}

    let in_front = {x: Math.floor(miner.location.x + 0.5), y: Math.floor(miner.location.y + 1.5), z: Math.floor(miner.location.z + 0.5)};


    if(dist == 2){
        in_front.x += headings2[ai_face].x; in_front.y += headings2[ai_face].y; in_front.z += headings2[ai_face].z; 
    }else{
        if(["up", "south", "west"].includes(ai_face)) dist++;
        if(dist > 0){ in_front.x += dist; in_front.y += dist; in_front.z += dist; }
    }

    if(JSON.stringify(in_front) != info.mine_last && info.ai_state != 1){
        info.mine_count_down = 3;
        info.mine_last = JSON.stringify(in_front);
        return false;
    }

    let mined_blocks_xz = [{x: 0.5, y: 0.5, z: 0}, {x: -0.5, y: -0.5, z: 0}, {x: 0.5, y: -0.5, z: 0}, {x: -0.5, y: 0.5, z: 0},
    {x: -1.5, y: -0.5, z: 0}, {x: -1.5, y: 0.5, z: 0}, {x: 1.5, y: -0.5, z: 0}, {x: 1.5, y: 0.5, z: 0},
    {x: -0.5, y: -1.5, z: 0}, {x: -0.5, y: 1.5, z: 0}, {x: 0.5, y: -1.5, z: 0}, {x: 0.5, y: 1.5, z: 0}
    ];

    let mined_blocks_y = [{x: 0.5, y: 0, z: 0.5}, {x: -0.5, y: 0, z: -0.5}, {x: 0.5, y: 0, z: -0.5}, {x: -0.5, y: 0, z: 0.5},
    {x: -1.5, y: 0, z: -0.5}, {x: -1.5, y: 0, z: 0.5}, {x: 1.5, y: 0, z: -0.5}, {x: 1.5, y: 0, z: 0.5},
    {x: -0.5, y: 0, z: -1.5}, {x: -0.5, y: 0, z: 1.5}, {x: 0.5, y: 0, z: -1.5}, {x: 0.5, y: 0, z: 1.5}
    ];

    let mined_blocks = (ai_face == "up" || ai_face == "down") ? mined_blocks_y: mined_blocks_xz;

    let sides = {north: 0, south: Math.PI, west: Math.PI/2, east: 3 * Math.PI/2, up: 0, down: 0};

    info.try_block_limit = limit;
    let is_way_barred = false;

    for(let vector of mined_blocks){
        vector = {x: in_front.x + (vector.x * Math.cos(sides[ai_face]) - vector.z * Math.sin(sides[ai_face])), 
            y: in_front.y +  vector.y, 
            z: in_front.z + (vector.x * Math.sin(sides[ai_face]) + vector.z * Math.cos(sides[ai_face]))};
        let block = miner.dimension.getBlock(vector);
        if(block && !block.isAir){
            if(!unbreakable_blocks.includes(block.typeId) && !block.hasTag("wire") && !block.hasTag("pipe")){
                block.setPermutation(BlockPermutation.resolve("minecraft:air"))
            }else is_way_barred = true;
        }
    }

    if(is_way_barred){
        info.velocity = {x: 0, y: 0, z: 0};
        info.try_block_limit = 0;
        if(info.ai_state == 2) info.ai_state = 4
        else if(info.ai_state == 3){
            info.path_blocked_count += 1;
            info.ai_state = 4;
        }else if(info.ai_state == 4){
            try_back_in(miner, info);
        }else freeze(5, info);
    }

    if(info.try_block_limit == limit && !info.no_speedup){
        info.velocity.x *= info.speedup;
        info.velocity.y *= info.speedup;
        info.velocity.z *= info.speedup;
    }

    return is_way_barred;
}

function try_back_in(miner, info){
    let {x, y, z} = info.base_pos;
    let {x: mx, y: my, z: mz} = miner.location;

    if(((mx - x) ** 2 * (my - y) ** 2 * (mz - z) ** 2) <= 9.1){
        info.ai_state = 5;
        info.targ_rot.y = facing_yaw[info.base_facing]; 
    }else{
        freeze(5, info);
    }
}

function move_to_pos(m_loc, pos, reverse, info){
    info.no_speedup = false;

    if(reverse != (!["east", "west"].includes(info.base_facing))){
        if (m_loc.z > pos.z + 0.0001 || m_loc.z < pos.z - 0.0001) move_to_axys(m_loc, pos.z, "z", info);
        else if (m_loc.y > pos.y - 0.9999 || m_loc.y < pos.y - 1.0001) move_to_axys(m_loc, pos.y - 1, "y", info);
        else if (m_loc.x > pos.x + 0.0001 || m_loc.x < pos.x - 0.0001) move_to_axys(m_loc, pos.x, "x", info);
        else return true; 
        // got there
    }else{

        if(m_loc.x > pos.x + 0.0001 || m_loc.x < pos.x - 0.0001) move_to_axys(m_loc, pos.x, "x", info);
        else if(m_loc.y > pos.y - 0.9999 || m_loc.y < pos.y - 1.0001) move_to_axys(m_loc, pos.y - 1, "y", info);
        else if(m_loc.z > pos.z + 0.0001 || m_loc.z < pos.z - 0.0001) move_to_axys(m_loc, pos.z, "z", info);
        else return true;
        // got there
    }

    return false;

}
function move_to_axys(m_pos, pos, axys, info){
    if(axys != "y") info.targ_rot.x = 0;

    const sides = {x: ["west", "east"], y: ["down", "up"], z: ["north", "south"]};
    const degrees = {x: [270, 90], y: [-90, 90], z: [180, 0]}

    let velocity = 0;
    if (m_pos[axys] > pos[axys]){
        if(info.ai_state != 5) info.targ_rot.y = degrees[axys][0]
        else if(axys == "y") info.targ_rot.x = degrees[axys][0];

        info.velocity[axys] = -info.speed;
        // TODO some acceleration and deceleration
        if (info.velocity[axys] * info.speedup <= pos[axys] - m_pos[axys])
        {
            velocity = pos[axys] - m_pos[axys];
            info.no_speedup = true;
        }
        info.ai_facing = sides[axys][0];
    }else{
        if(axys !== "y" && info.ai_state != 5) info.targ_rot.y = degrees[axys][1];
        else if(axys == "y") info.targ_rot.x = degrees[axys][1];

        info.velocity[axys] = info.speed;
        // TODO some acceleration and deceleration
        if (info.velocity[axys] * info.speedup >= pos[axys] - m_pos[axys]){
            velocity = pos[axys] - m_pos[axys];
            info.no_speedup = true;
        }
        info.ai_facing = sides[axys][1];
    }

    info.velocity = {x: 0, y: 0, z: 0}
    info.velocity[axys] = velocity;

    if(info.stopForTurn) info.velocity[axys] = 0;
}