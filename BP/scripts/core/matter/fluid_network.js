import { world, system, BlockPermutation} from "@minecraft/server"
import { side_blocks, update_pipe_network} from "../blocks/fluid_pipe";

export let fluid_network = {}
system.run(() => {fluid_network = JSON.parse(world.getDynamicProperty("fluid_network") ?? "{}")});

export function create_network(pipe, type, fluid_amount){
    let network_ids = Object.keys(fluid_network);
    let last_id = network_ids.at(-1) ?? 0;
    let new_id = parseInt(last_id) + 1;
    world.setDynamicProperty(JSON.stringify(pipe.location), new_id);
    fluid_network[new_id] = {type};
    let pipes_number = update_pipe_network(pipe, new_id);
    
    let space = pipes_number * 200;
    let capacity = Math.min(space, fluid_amount);
    fluid_amount -= capacity;

    //t is type, p is number of pipes, c is capacity, m is for input machines
    fluid_network[new_id] = {t: type, p: pipes_number, c: capacity, m: []};
    world.setDynamicProperty("fluid_network", JSON.stringify(fluid_network))
    return fluid_amount;
}

export function refresh_network(pipe, id){
    let pipes_number = update_pipe_network(pipe, id);
    if(id) fluid_network[id].p = pipes_number;
    world.setDynamicProperty("fluid_networkd", JSON.stringify(fluid_network))
}

//updates visual part of pipes
export function* update_fluid(pipe, fluid, liquid_type){
    let updated_pipes = [];
    let pipes_to_update = [];
    const new_type = (fluid == "empty")? "cosmos:fluid_pipe" : "cosmos:fluid_pipe" + "_" + fluid;
    pipes_to_update = get_sides(pipe, updated_pipes);
    let pipe_states = pipe.permutation.getAllStates();

    if(liquid_type && fluid != "empty") pipe_states["cosmos:liquid_type"] = liquid_type;
    else delete pipe_states["cosmos:liquid_type"];

    pipe.setPermutation(BlockPermutation.resolve(new_type, pipe_states));

    for(let i = 0; i < pipes_to_update.length; i++){
        let block = pipes_to_update[i];
        updated_pipes.push(JSON.stringify({x: block.x, y: block.y, z: block.z}));
        let new_pipe = pipe.dimension.getBlock(block);
        if(new_pipe && !new_pipe.isAir && new_pipe.hasTag("fluid_pipe")){
            pipes_to_update = [...pipes_to_update, ...get_sides(new_pipe, updated_pipes)]
            let new_pipe_states = new_pipe.permutation.getAllStates();

            if(liquid_type && fluid != "empty") new_pipe_states["cosmos:liquid_type"] = liquid_type;
            else delete new_pipe_states["cosmos:liquid_type"];

            new_pipe.setPermutation(BlockPermutation.resolve(new_type, new_pipe_states));
            yield;
        }
    }

}
function get_sides(pipe, updated_pipes){
    let sides = pipe.permutation.getAllStates();
	let loc = pipe.location;
	let blocks = side_blocks(loc);
    let pipes = [];
    for(let side in sides){
        if(!sides[side] || !blocks[side]) continue;
        let block = blocks[side];
        if(updated_pipes.includes(JSON.stringify({x: block.x, y: block.y, z: block.z}))) continue;
        pipes.push(block);
    }
    return pipes;
}