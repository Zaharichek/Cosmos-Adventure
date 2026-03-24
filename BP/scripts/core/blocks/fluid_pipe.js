import { world, BlockPermutation, system } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { str_pos } from "./aluminum_wire"
import { get_entity } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"
import { compare_position, location_of_side } from "../../api/utils.js"

function side_blocks(loc){ 
	return {
	"cosmos:fluid_up": {x: loc.x, y: loc.y + 1, z: loc.z},
	"cosmos:fluid_down": {x: loc.x, y: loc.y - 1, z: loc.z},
	"cosmos:fluid_north": {x: loc.x, y: loc.y, z: loc.z - 1},
	"cosmos:fluid_south": {x: loc.x, y: loc.y, z: loc.z + 1},
	"cosmos:fluid_east": {x: loc.x + 1, y: loc.y, z: loc.z},
	"cosmos:fluid_west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
}

const faces = ["cosmos:fluid_up", "cosmos:fluid_north", 
	"cosmos:fluid_east", "cosmos:fluid_west", "cosmos:fluid_south", "cosmos:fluid_down"]
const same_side = {
	above: "cosmos:fluid_up",
	below: "cosmos:fluid_down",
	north: "cosmos:fluid_north",
	south: "cosmos:fluid_south",
	east: "cosmos:fluid_east",
	west: "cosmos:fluid_west", 
}
const opposite_side = {
	above: "cosmos:fluid_down",
	below: "cosmos:fluid_up",
	north: "cosmos:fluid_south",
	south: "cosmos:fluid_north",
	east: "cosmos:fluid_west", 
	west: "cosmos:fluid_east",
}

export function detach_pipes(block) {
	const neighbors = block.getNeighbors(6)
	for (const [i, pipe] of neighbors.entries()) {
		if ('cosmos:fluid_pipe' == pipe.typeId) 
			pipe.setPermutation(pipe.permutation.withState(faces[5 - i], 0))
	}
}
export function attach_pipes(block){
	const data = Object.entries(machines[block.typeId.replace('cosmos:', '')]);
	data.forEach((slot) => {
		if(slot[0] == 'energy') return;
		if(slot[1].input){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].input));
			if(pipe?.typeId == 'cosmos:fluid_pipe') connect_pipes(pipe)
		}
		if(slot[1].output){
			const pipe = block.dimension.getBlock(location_of_side(block, slot[1].output));
			if(pipe?.typeId == 'cosmos:fluid_pipe') connect_pipes(pipe)
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
			if(sides[block] == 1) pipes.set(loc_as_string, {type: 'pipe', connected: undefined});
			else pipes.set(loc_as_string, {type:  undefined, connected: [loc]});
				
		}else if(pipe_in_map.connected){
			let position = pipe_in_map.connected.find((element) => !compare_position(loc, element));
			if(position){
				pipe_in_map.connected.push(loc);
			}
			pipes.set(loc_as_string, pipe_in_map);
		}
	}
}
function find_connected_machines(first_pipe, perm = first_pipe.permutation){
	let pipesWillDone = new Map();
	let foundMachines = [];
	let pipesIterator = pipesWillDone[Symbol.iterator]();

	getSides(first_pipe, perm, pipesWillDone);
	for(let pipe of pipesIterator){
		let block = first_pipe.dimension.getBlock(JSON.parse(pipe[0]));
		if(pipe[1].type == "pipe" && !block.isAir){
			getSides(block, block.permutation, pipesWillDone)
		}
	}
	pipesWillDone.forEach((value, key) => {
		if(value.type == "pipe") return;
		let block = first_pipe.dimension.getBlock(JSON.parse(key));
		if(block.isAir) return;
		let machineEntity = get_entity(block.dimension, block.center(), "cosmos");
		if(!machineEntity) return;
		
		let machineData = Object.entries(get_data(machineEntity));
		let slots = [];
		machineData.forEach((element, index) => {
			if(element[1] == "energy") return;
			if(element[1].input) slots[index].input = location_of_side(block, element[1].input)
            if(element[1].output) slots[index].output = location_of_side(block, element[1].output)
	    });

		let final_slot = {};

		value.connected.forEach((vector) => {
			slots.forEach((element) => {
				const input = element[1].input;
				const output = element[1].output;
                final_slot[element[0]] = [];
				if(input && compare_position(input, vector)){
					final_slot[element[0]].push("input")
				}
				if(output && compare_position(output, vector)){
					final_slot[element[0]].push("output")
				}
				if(!final_slot[element[0]].length) final_slot[element[0]] = undefined;
			});
		});

		foundMachines.push([machineEntity.id, final_slot])
    });
	return foundMachines;
}

function connect_pipes(pipe) {
	const neighbors = pipe.six_neighbors()
	const states = {}
	for (const [side, block] of Object.entries(neighbors)) {
		if (block.typeId == 'cosmos:fluid_pipe') {
			block.setPermutation(block.permutation.withState(opposite_side[side], 1))
			states[same_side[side]] = 1
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
			    if(connections.includes(str_pos(pipe.location))) states[same_side[side]] = 1
			});
		}
	}
	pipe.setPermutation(BlockPermutation.resolve("cosmos:fluid_pipe", states))
}

export function fluidNetwork(foundMachines){
	for(machine_data in foundMachines){
		let machine = world.getEntity(machine_data[0]);
		const data = get_data(machine);
		
		data.forEach((slot) => {
			if(slot[0] == 'energy' || (!slot[1].input && !slot[1].output)) return;
		});
	}
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('cosmos:fluid_pipe', {
		onPlace(event) {
			const { block } = event;
			connect_pipes(block, "cosmos:fluid_pipe")
		},
		onPlayerBreak({block}) {
			const neighbors = block.getNeighbors(6)
			for (const [i, pipe] of neighbors.entries()) {
				if ('cosmos:fluid_pipe' == pipe.typeId) 
					pipe.setPermutation(pipe.permutation.withState(faces[5 - i], 0))
			}
		},
	})
})