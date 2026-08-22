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

const unbreakable_blocks = [
    "minecraft:water", "minecraft:lava", "minecraft:bedrock", "minecraft:end_portal", "minecraft:end_frame",
    "minecraft:portal", "minecraft:rail", "minecraft:farmland", "minecraft:lever", "minecraft:redstone_wire",
    "minecraft:stonebrick", "minecraft:mossy_cobblestone", "cosmos:walkway", "cosmos:astro_miner_base"
];
export default function(entity){
    let miner_data = load_dynamic_object(entity, "vehicle_data");
    let ai_facing = miner_data.ai_side ?? "down";
    move_miner(entity, 2, ai_facing);
    entity.clearVelocity()
    entity.applyImpulse({x: 0, y: -0.1, z: 0})
    console.warn(JSON.stringify(miner_data))
}

function move_miner(miner, dist, ai_face){
    const headings2 = {down: {x: 0, y: -3, z: 0}, up: {x: 0, y: 2, z: 0}, 
    south: {x: 0, y: 0, z: -3}, north: {x: 0, y: 0, z: 2}, east: {x: 2, y: 0, z: 0}, west: {x: -3, y: 0, z: 0}}

    let in_front = {x: Math.floor(miner.location.x + 0.5), y: Math.floor(miner.location.y + 1.5), z: Math.floor(miner.location.z + 0.5)};

    if(dist == 2){
        in_front.x += headings2[ai_face].x; in_front.y += headings2[ai_face].y; in_front.z += headings2[ai_face].z; 
    }else{
        if(["up", "south", "west"].includes(ai_face)) dist++;
        if(dist > 0){ in_front.x += dist; in_front.y += dist; in_front.z += dist; }
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

    }
}