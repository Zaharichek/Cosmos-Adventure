import { system, world } from "@minecraft/server";
import { charge_from_battery, charge_from_machine } from "../../matter/electricity.js";
import { load_dynamic_object, save_dynamic_object } from "../../../api/utils.js";
import { machine_buttons, setup_ui_button } from "../MachineButtons.js";

export let astro_miner_bases = new Map();

function reload_base(entity){
	if (astro_miner_bases.has(entity.id)) return;
	const dynamic_object = JSON.parse(entity.getDynamicProperty("machine_data") ?? "{}");
	astro_miner_bases.set(entity.id, { entity_data: dynamic_object });
}

world.afterEvents.entityLoad.subscribe(({entity}) => {
	if(entity.typeId == "cosmos:astro_miner_base") reload_base(entity);
});

world.afterEvents.worldLoad.subscribe(() => {
	world.getDims(dimension => dimension.getEntities({type: "cosmos:astro_miner_base"})).forEach(entity => {reload_base(entity)});
	system.runInterval(() => {
		if (astro_miner_bases.size === 0) return;
		// give block access every 2 ticks
		astro_miner_bases.forEach((miner_data, entityId) => {
			const astro_miner_base = world.getEntity(entityId);
			if(!(system.currentTick % 20)) astro_miner_base.addEffect("invisibility", 9999, {showParticles: false});
		});
	});
});

export const base_component = {
	beforeOnPlayerPlace(event) {
		const { block, permutationToPlace: perm } = event;
		let {x, y, z} = block.location;
		//i don't have enough iq to make it fully generated in loop so it is as it is
		let vectors = [[{x: -1, z: 0}, {x: 0, z: 1}, {x: -1, z: 1}], [{x: 1, z: 0}, {x: 0, z: 1}, {x: 1, z: 1}],
	    [{x: 1, z: 0}, {x: 0, z: -1}, {x: 1, z: -1}], [{x: 0, z: -1}, {x: -1, z: 0}, {x: -1, z: -1}]];

		let base_vector = undefined;
		let base_y = undefined;
		y_loop: for(let y_b of [-1, 1]){
			if(block.dimension.getBlock({x: x, y: y + y_b, z: z}).permutation.getState("cosmos:miner_pos") !== 0) continue;
			vector_loop: for(let element of vectors){
				for(let vector of element){
					let block_1 = block.dimension.getBlock({x: x + vector.x, y: y + y_b, z: z + vector.z});
					let block_2 = block.dimension.getBlock({x: x + vector.x, y: y, z: z + vector.z});

					console.warn(block_1.permutation.getState("cosmos:miner_pos"), (block_1.permutation.getState("cosmos:miner_pos") === 0 && block_2.permutation.getState("cosmos:miner_pos") === 0))
					if(block_1.permutation.getState("cosmos:miner_pos") === 0 && block_2.permutation.getState("cosmos:miner_pos") === 0) continue;
					else {continue vector_loop; break;}
				}
				base_y = y_b;
				base_vector = element;
				base_vector.push({x: 0, z: 0});
				break y_loop;
				break;
		    }
		}
		if(base_vector){
			system.run(() => {
				let center = {x: 0, y: 0, z: 0};
				for(let i = -1; i < 3;){
					i++;
					let position = base_vector[i];
					center.x += x + position.x; center.y += (2 * y) + base_y; center.z += z + position.z;
					if(base_y == 1){
						block.dimension.getBlock({x: x + position.x, y: y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", i + 1));
                        block.dimension.getBlock({x: x + position.x, y: y + base_y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", i + 2));
					}else{
						block.dimension.getBlock({x: x + position.x, y: y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", i + 2));
                        block.dimension.getBlock({x: x + position.x, y: y + base_y, z: z + position.z}).setPermutation(perm.withState("cosmos:miner_pos", i + 1));
					}
				}
				center.x = center.x/4 + 0.5; center.y = center.y/8 - 0.5; center.z = center.z/4 + 0.5;
				console.warn(JSON.stringify(center))
				const entity = block.dimension.spawnEntity("cosmos:astro_miner_base", center);
				//attach_to_wires(block);
				//attach_pipes(block)
		    });
		}
	},
	onPlayerBreak({ block, dimension, brokenBlockPermutation: perm }) {
		detach_wires(block);
		detach_pipes(block, perm, "machine");
		
		const entity = dimension.getEntities({
			type: perm.type.id,
			location: {
				x: Math.floor(block.location.x) + 0.5,
				y: Math.floor(block.location.y) + 0.5,
				z: Math.floor(block.location.z) + 0.5,
			},
			maxDistance: 0.5,
		})[0];
		if (!entity) return;

		machine_entities.delete(entity.id);
		const container = entity.getComponent('minecraft:inventory')?.container;
		if (container) {
			for (let i = 0; i < container.size; i++) {
				const itemId = container.getItem(i)?.typeId;
				if (!['cosmos:ui', 'cosmos:ui_button'].includes(itemId)) continue;
				container.setItem(i);
			}
		}
		entity.kill(); // kill to make it drop the items
		entity.remove();
	},
}

world.beforeEvents.playerInteractWithEntity.subscribe((data) => {
	if(data.target.typeId == "cosmos:astro_miner_base" && data.itemStack?.typeId == "cosmos:astro_miner_item"){
		system.run(() => {data.target.dimension.spawnEntity("cosmos:astro_miner", data.target.location)});
		data.cancel = true;
	}
});