import { world, BlockPermutation, system } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { str_pos } from "./aluminum_wire"
import { get_entity, six_neighbors } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"
import { compare_position, location_of_side } from "../../api/utils.js"
import { update_fluid, fluid_network, create_network, refresh_network } from "../matter/fluid_network.js"
import { load_dynamic_object } from "../../api/utils.js"

export function side_blocks(loc){ 
	return {
	"cosmos:fluid_up": {x: loc.x, y: loc.y + 1, z: loc.z},
	"cosmos:fluid_down": {x: loc.x, y: loc.y - 1, z: loc.z},
	"cosmos:fluid_north": {x: loc.x, y: loc.y, z: loc.z - 1},
	"cosmos:fluid_south": {x: loc.x, y: loc.y, z: loc.z + 1},
	"cosmos:fluid_east": {x: loc.x + 1, y: loc.y, z: loc.z},
	"cosmos:fluid_west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
}

export const pipe_same_side = {
	above: "cosmos:fluid_up",
	below: "cosmos:fluid_down",
	north: "cosmos:fluid_north",
	south: "cosmos:fluid_south",
	east: "cosmos:fluid_east",
	west: "cosmos:fluid_west", 
}
export const pipe_opposite_side = {
	above: "cosmos:fluid_down",
	below: "cosmos:fluid_up",
	north: "cosmos:fluid_south",
	south: "cosmos:fluid_north",
	east: "cosmos:fluid_west", 
	west: "cosmos:fluid_east",
}

export function get_direction(location){
	const sides = [
		[{x: 1, y: 0, z: 0}, 'east'],
		[{x: -1, y: 0, z: 0}, 'west'],
		[{x: 0, y: 0, z: 1}, 'south'],
		[{x: 0, y: 0, z: -1}, 'north'],
		[{x: 0, y: 1, z: 0}, 'up'],
		[{x: 0, y: -1, z: 0}, 'down']
	]
	for(let side of sides){
		if(side[0].x == location.x && side[0].y == location.y && side[0].z == location.z) return side[1]
	}
}
export function detach_pipes(block) {
	const neighbors = six_neighbors(block)
	for (const side in neighbors) {
		const pipe = neighbors[side]
		if (!pipe.hasTag("fluid_pipe")) continue
		pipe.setPermutation(pipe.permutation.withState(pipe_opposite_side[side], 0))
	}
}
export function attach_pipes(block){
	const data = Object.entries(machines[block.typeId.replace('cosmos:', '')]);
	data.forEach((slot) => {
		if(slot[0] == 'energy' || slot[0] == 'items') return;
		if(slot[1].input){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].input));
			if(pipe?.hasTag("fluid_pipe")) connect_pipes(pipe)
		}
		if(slot[1].output){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].output));
			if(pipe?.hasTag("fluid_pipe")) connect_pipes(pipe)
		}
	});
}
//attaching with using key
export function attach_to_machine(pipe){
	const location = pipe.location;
	const sides = pipe.permutation.getAllStates();
	const blocks = side_blocks(location);

	for(let block in sides){
		if(!blocks[block] || !sides[block]) continue;
		const machine = pipe.dimension.getBlock(blocks[block]);
		if(!machine || machine.isAir || !machines[machine.typeId.replace('cosmos:', '')]) continue;
		sides[block] = (sides[block] == 1)? 2: 1;
	}
	pipe.setPermutation(BlockPermutation.resolve(pipe.typeId, sides));

}
function getSides(pipeOs, permutation, pipes){
	let sides = permutation.getAllStates();
	let loc = pipeOs.location;
	const blocks = side_blocks(loc);
	for(let block in sides){
		if(!sides[block] || !blocks[block]) continue;
		let loc_as_string = JSON.stringify(blocks[block]);
		let pipe_in_map = pipes.get(loc_as_string);
		if(!pipe_in_map){
			let connected_block = pipeOs.dimension.getBlock(blocks[block]);
			if(connected_block?.hasTag("fluid_pipe")) pipes.set(loc_as_string, connected_block);
		}
	}
}
export function update_pipe_network(first_pipe, id, perm = first_pipe.permutation){
	if(!perm?.hasTag("fluid_pipe")) return;
	let pipesWillDone = new Map();
	let pipesIterator = pipesWillDone[Symbol.iterator]();
	let pipes_counter = 0;
	getSides(first_pipe, perm, pipesWillDone);
	for(let pipe of pipesIterator){
		let block = pipe[1];
		if(!block.isAir){
			getSides(block, block.permutation, pipesWillDone)
		}
	}
	pipesWillDone.forEach((value, key) => {
		pipes_counter++;
		let block = value;
		let block_id = world.getDynamicProperty(JSON.stringify(block.location));
		if(block_id != id){
			delete fluid_network[block_id];
			world.setDynamicProperty(JSON.stringify(block.location), id);
		}
    });
	return pipes_counter;
}

function connect_pipes(pipe) {
	const neighbors = six_neighbors(pipe)
	const states = {}
	let first_found_id;
	let pipes = [];
	let network_ids = new Set();

	for (const [side, block] of Object.entries(neighbors)) {
		if (block.hasTag("fluid_pipe")) {
			block.setPermutation(block.permutation.withState(pipe_opposite_side[side], 1));
			states[pipe_same_side[side]] = 1;

			let network_id = world.getDynamicProperty(JSON.stringify(block.location));
			pipes.push(block);
			network_ids.add(network_id);
		}

		const machine_type = block.typeId.split(':').pop()
		if (Object.keys(machines).includes(machine_type)) {
			const machine = machines[machine_type]
			Object.entries(machine).forEach((element) => {
				if(element[0] == "energy") return;
				const connections = [
				    str_pos(location_of_side(block, element[1].input)),
				    str_pos(location_of_side(block, element[1].output))
			    ];
			    if(connections.includes(str_pos(pipe.location))) states[pipe_same_side[side]] = 1
			});
		}
	}
	pipe.setPermutation(BlockPermutation.resolve(pipe.typeId, states));

	let network_id = Array.from(network_ids)[0];

	if(fluid_network[network_id]){
		if(pipes.length == 1 && network_ids.size == 1){
			world.setDynamicProperty(JSON.stringify(pipe.location), network_id);
			fluid_network[network_id].p += 1;
			world.setDynamicProperty("fluid_network", JSON.stringify(fluid_network))
		}else if(pipes.length > 1 && network_ids.size == 1){
			refresh_network(pipe, network_id)
		}else if(network_ids.size > 1){
			let capacity = 0;
			network_ids.forEach((id) => {
				if(network_id == id) capacity += fluid_network[network_id].c;
				else delete fluid_network[network_id];
			});
			refresh_network(pipe, network_id);
			fluid_network[network_id].c = capacity;
			world.setDynamicProperty("fluid_network", JSON.stringify(fluid_network))
		}
	}else if(network_id) refresh_network(pipe, undefined);
}


export const fluid_pipe_component = {
	beforeOnPlayerPlace({block}) {
		system.run(() => {connect_pipes(block)});
	},
	onPlayerBreak({block}) {
		detach_pipes(block)
	},
}