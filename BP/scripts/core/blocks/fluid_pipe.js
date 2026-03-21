import { world, BlockPermutation, system } from "@minecraft/server"
import machines from "../machines/AllMachineBlocks.js"
import { opposite_side, same_side, str_pos } from "./aluminum_wire"
import { get_entity } from "../../api/utils.js"
import { get_data } from "../machines/Machine.js"
import { compare_position, location_of_side } from "../../api/utils.js"

const faces = ["cosmos:up", "cosmos:north", "cosmos:east", "cosmos:west", "cosmos:south", "cosmos:down"]

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

export function attach_pipes(block, attach = true) {
	const neighbors = block.getNeighbors(6)
	for (const [i, pipe] of neighbors.entries()) {
		if ('cosmos:fluid_pipe' == pipe.typeId) 
			pipe.setPermutation(pipe.permutation.withState(faces[5 - i], attach))
	}
}
const blocks = {
	"cosmos:up": {x: 0, y: 1, z: 0},
	"cosmos:down": {x:0, y: 1, z: 0},
	"cosmos:north": {x: 0, y: 0, z:  1},
	"cosmos:south": {x: 0, y: 0, z:  1},
	"cosmos:east": {x:  1, y: 0, z: 0},
	"cosmos:west": {x:  1, y: 0, z: 0}
}

function getSides(pipeOs, permutation, pipes){
	let sides = permutation.getAllStates();
	let loc = pipeOs.location;
	const blocks = {
		"cosmos:up": {x: loc.x, y: loc.y + 1, z: loc.z},
		"cosmos:down": {x: loc.x, y: loc.y - 1, z: loc.z},
		"cosmos:north": {x: loc.x, y: loc.y, z: loc.z - 1},
		"cosmos:south": {x: loc.x, y: loc.y, z: loc.z + 1},
		"cosmos:east": {x: loc.x + 1, y: loc.y, z: loc.z},
		"cosmos:west": {x: loc.x - 1, y: loc.y, z: loc.z}
	}
	for(let block in sides){
		if(!sides[block] || !blocks[block]) continue;
		let loc_as_string = JSON.stringify(blocks[block]);
		let pipe_in_map = pipes.get(loc_as_string);
		if(!pipe_in_map){
			pipes.set(loc_as_string, {type: 
				(pipeOs.dimension.getBlock(blocks[block]).typeId == "cosmos:fluid_pipe")? "pipe": undefined, 
				connected: (pipeOs.dimension.getBlock(blocks[block]).typeId != "cosmos:fluid_pipe")? 
				loc: undefined});
				
		}else if(pipe_in_map.connected && !compare_position(loc, pipe_in_map.connected)){
			pipe_in_map.slot = "both";
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
		
		let machineData = get_data(machineEntity);
		let final_slot = {};
		Object.entries(machineData).forEach((element) => {
			if(element[0] == "energy") return;
			const connections = {
				input: location_of_side(block, element[1].input),
				output: location_of_side(block, element[1].output)
			};
			if(compare_position(connections.input, value.connected)) final_slot[element[0]] = "input"
			else if(compare_position(connections.output, value.connected)) final_slot[element[0]] ="output"
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
			block.setPermutation(block.permutation.withState(opposite_side[side], true))
			states[same_side[side]] = true
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
			    if(connections.includes(str_pos(pipe.location))) states[same_side[side]] = true
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
					pipe.setPermutation(pipe.permutation.withState(faces[5 - i], false))
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
