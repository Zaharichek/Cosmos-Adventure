import { world, BlockPermutation, system } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { str_pos } from "./aluminum_wire"
import { get_entity } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"
import { compare_position, location_of_side } from "../../api/utils.js"
import electric_furnace from "../../recipes/electric_furnace.js"

const faces = ["cosmos:fluid_up", "cosmos:fluid_north", 
	"cosmos:fluid_east", "cosmos:fluid_west", "cosmos:fluid_south", "cosmos:fluid_down"]
const same_side = {
	above: "cosmos:fluid_uo",
	below: "cosmos:fluid_down",
	north: "cosmos:fluid_north",
	south: "cosmos:fluid_south",
	east: "cosmos:fluid_east",
	west: "cosmos:fluid_west", 
}
const opposite_side = {
	above: "cosmos:fluid_down",
	below: "cosmos:fluid_uo",
	north: "cosmos:fluid_south",
	south: "cosmos:fluid_north",
	east: "cosmos:fluid_west", 
	west: "cosmos:fluid_east",
}
const dyes = {
	"minecraft:white_dye": "white",
	"minecraft:light_gray_dye": "silver",
	"minecraft:gray_dye": "gray",
	"minecraft:black_dye": "black",
	"minecraft:brown_dye": "brown",
	"minecraft:red_dye": "red",
	"minecraft:orange_dye": "orange",
	"minecraft:yellow_dye": "yellow",
	"minecraft:lime_dye": "lime",
	"minecraft:green_dye": "green",
	"minecraft:light_blue_dye": "light_blue",
	"minecraft:cyan_dye": "cyan",
	"minecraft:blue_dye": "blue",
	"minecraft:purple_dye": "purple",
	"minecraft:magenta_dye": "magenta",
	"minecraft:pink_dye": "pink",
}

export function attach_pipes(block, attach = 1) {
	const neighbors = block.getNeighbors(6)
	for (const [i, pipe] of neighbors.entries()) {
		if ('cosmos:fluid_pipe' == pipe.typeId) 
			pipe.setPermutation(pipe.permutation.withState(faces[5 - i], attach))
	}
}

function getSides(pipeOs, permutation, pipes){
	let sides = permutation.getAllStates();
	let loc = pipeOs.location;
	const blocks = {
		"cosmos:fluid_up": {x: loc.x, y: loc.y + 1, z: loc.z},
		"cosmos:fluid_down": {x: loc.x, y: loc.y - 1, z: loc.z},
		"cosmos:fluid_north": {x: loc.x, y: loc.y, z: loc.z - 1},
		"cosmos:fluid_south": {x: loc.x, y: loc.y, z: loc.z + 1},
		"cosmos:fluid_east": {x: loc.x + 1, y: loc.y, z: loc.z},
		"cosmos:fluid_west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
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
		machineData = JSON.parse(JSON.stringify(machineData));
		
		machineData.filter((element) => 
			(element[0] !== 'energy' && (element[1].input || element[1].output))
		);
		machineData.forEach((element, index) => {
			if(element[1].input) element[1].input = location_of_side(block, element[1].input)
            if(element[1].output) element[1].output = location_of_side(block, element[1].output)
			machineData[index] = element;
	    });

		let final_slot = {};

		value.connected.forEach((vector) => {
			machineData.forEach((element) => {
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
	let sus = find_connected_machines(pipe, BlockPermutation.resolve("cosmos:fluid_pipe", states));
	console.warn(JSON.stringify(sus))
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
		/*
		onPlayerInteract({player, block}) {
			const equipment = player.getComponent("minecraft:equippable")
			const item = equipment.getEquipment("Mainhand")?.typeId
			const pipe = block.permutation
			if (item == "cosmos:standard_wrench") {
				const neighbors = block.getNeighbors(6).map(tank => tank.typeId)
				if (neighbors.includes("cosmos:fluid_tank")) {
	  				block.setPermutation(pipe.withState(`cosmos:pull`, !pipe.getState(`cosmos:pull`)))
				}
			}
			if (Object.keys(dyes).includes(item) && pipe.getState('cosmos:color') != dyes[item]) {
				block.setPermutation(pipe.withState('cosmos:color', dyes[item]))
				player.runCommand(`clear @s ${item} 0 1`)
			}
		}*/
	})
})