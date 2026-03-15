import { system, ItemStack } from "@minecraft/server";
import { charge_from_battery, charge_from_machine} from "../../matter/electricity.js";
import { compare_lists, load_dynamic_object, location_of_side, save_dynamic_object } from "../../../api/utils.js";
import { get_data } from "../Machine.js";
import { input_fluid, load_from_canister_instant } from "../../matter/fluids.js";

const pads = {
	"cosmos:moon_buggy": "cosmos:buggy_fueling_pad",
	"cosmos:rocket_tier_1": "cosmos:rocket_launch_pad",
	"cosmos:rocket_tier_2": "cosmos:rocket_launch_pad",
	"cosmos:rocket_tier_3": "cosmos:rocket_launch_pad"
}

function get_vehicles(block){
	if(!block.location) return;
	let {x, y, z} = block.location;

    let pad_one = location_of_side(block, "front")
    let pad_two = location_of_side(block, "back")

	let offset_1 = {x: (x - pad_one.x) * 2, z: (z - pad_one.z) * 2};
	let offset_2 = {x: (x - pad_two.x) * 2, z: (z- pad_two.z) * 2};

    pad_one = block.dimension.getBlock({x: x + offset_1.x, y: y, z: z + offset_1.z});
	pad_two = block.dimension.getBlock({x: x + offset_2.x, y: y, z: z + offset_2.z});

	let vehicles = [];
	[pad_one, pad_two].forEach((pad) => {
		if(pad.permutation.getState("cosmos:center")){
			let vehicle = pad.dimension.getEntities({families: ["requires_fuel"], location: pad.center(), maxDistance: 2})[0];
			if(vehicle && pads[vehicle.typeId] == pad.typeId) vehicles.push(vehicle);
		}
	});
    return vehicles;
}

export default class {
    constructor(entity, block) {
        this.entity = entity;
		this.block = block;
        if (entity.isValid) this.load_fuel()
    }
    load_fuel(){
        const stopped = this.entity.getDynamicProperty('stopped')
        const container = this.entity.getComponent('minecraft:inventory').container
		const data = get_data(this.entity)
		
		const variables = load_dynamic_object(this.entity, "machine_data")
		let energy = variables.energy ?? 0
		let fuel = variables.fuel ?? 0
		
	    energy = charge_from_machine(this.entity, this.block, energy)
		
		energy = charge_from_battery(this.entity, energy, 1)
		
		fuel = input_fluid("fuel", this.entity, this.block, fuel)
		fuel = load_from_canister_instant(fuel, "fuel", this.entity, 0).amount;
		if(!stopped && energy > 0 && fuel >= 2 && this.block){
		    let vehicles = get_vehicles(this.block)
		    if(vehicles.length > 0){
		        vehicles.forEach((vehicle) =>{
					let vehicle_dynamic_object = load_dynamic_object(vehicle, "vehicle_data")
		            let fuel_level = vehicle_dynamic_object?.fuel ?? 0;
		            if(fuel_level < 1000){
		                let level = Math.min(1000, fuel_level + 2)
						vehicle_dynamic_object.fuel = level;
		                save_dynamic_object(vehicle, vehicle_dynamic_object, "vehicle_data");
		                fuel = Math.max(0, fuel - 2)
		                energy = Math.max(0, energy - 30)
		            }
		        })
		        
		    }
		}
		save_dynamic_object(this.entity, {energy, fuel}, "machine_data")
		
		const status =
			energy == 0 ? "§4No Power" : 
			fuel == 0 ? "§4No Fuel to Load" :
			stopped ? "§6Ready" :
			energy < 30 ? "§6Not Enough Power" :
			"§2Load Fuel"
        
		container.add_ui_display(2, `Energy Storage\n§aEnergy: ${energy} gJ\n§cMax Energy: ${data.energy.capacity} gJ`, Math.round((energy / data.energy.capacity) * 55))
		container.add_ui_display(3, `Fuel Storage\n§eFuel: ${fuel} / ${data.fuel.capacity} mB`, Math.ceil((Math.ceil(fuel / 1000) / (data.fuel.capacity / 1000)) * 38))
		container.add_ui_display(4, `§rStatus: ${status}`)
        if (!container.getItem(5)) {
            this.entity.setDynamicProperty('stopped', !stopped)
            container.add_ui_button(5, stopped ? 'Stop Loading' : 'Loading')
        }
		
	}
}
