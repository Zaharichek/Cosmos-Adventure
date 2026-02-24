import {world} from "@minecraft/server"

class Station{
  constructor(owner){
     this.owner = owner;
  }

  create_station(owner){
    const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
    station_index = Object.keys(space_stations).length;
    space_stations[owner.nameTag] = { name: `${owner.nameTag}'s Space Station`, station_index, owner: owner.nameTag }
    world.setDynamicProperty("all_space_stations", JSON.stringify(space_stations))
  }

  rename_station(owner, name){
    const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
    space_stations[owner].name = name;
    world.setDynamicProperty("all_space_stations", JSON.stringify(space_stations))
  }

  teleport_to_station(owner){
    const space_stations = JSON.parse(world.getDynamicProperty("all_space_stations") ?? '{}')
    let station = space_stations[owner];
  }
}