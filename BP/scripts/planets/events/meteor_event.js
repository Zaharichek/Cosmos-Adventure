import {world, BlockPermutation} from "@minecraft/server";
import { player_gravity } from "../dimension/gravity";

function get_view_distant(player, radius){
    for(let r of [1, 0.5, 0.35, 0.1]){
        if(player.dimension.isChunkLoaded({x: player.location.x + Math.floor(radius * r), y: 0, z: player.location.z})){
            radius = Math.floor(radius * r);
            return radius;
        }else if(r == 0.25) return undefined;
    }
}
export function throw_meteors(player){
    let cofficient = 10;
    let chance = 5 * 750 * (1/cofficient);
    let dim = player.dimension;
    if(Math.floor(Math.random() * chance) === 0){
        let closest_player = dim.getPlayers({location: player.location, maxDistance: 100, closest: 5, minDistance: 2})[0]
        closest_player = (!closest_player)? player: closest_player;
        let {x: px, y: py, z: pz} = closest_player.location;
        let x = Math.floor(Math.random() * 20) + 160;
        let z = Math.floor(Math.random() * 20) - 10;
        let motX = Math.random() * 2 - 2.5;
        let motZ = Math.random() * 5 - 2.5;
        x = get_view_distant(closest_player, x);
        if(!x) return;
        let floor_x = Math.floor(px)
        //so it reduces radius if chunks aren't loaded yet
        let meteor = dim.spawnEntity("cosmos:fallen_meteor", {x: px + x, y: 255, z: pz + z})
        let projectile = meteor.getComponent("minecraft:projectile");
        projectile.gravity = 0.03999999910593033;
        projectile.shoot({x: motX, y: 0, z: motZ})
    }
    if(Math.floor(Math.random() * chance * 3) === 0){
        let closest_player = dim.getPlayers({location: player.location, maxDistance: 100, closest: 5, minDistance: 2})[0]
        closest_player = (!closest_player)? player: closest_player;
        let {x: px, y: py, z: pz} = closest_player.location;
        let x = Math.floor(Math.random() * 20) + 160;
        let z = Math.floor(Math.random() * 20) - 10;
        let motX = Math.random() * 2 - 2.5;
        let motZ = Math.random() * 5 - 2.5;
        x = get_view_distant(closest_player, x);
        if(!x) return;
        let floor_x = Math.floor(px)
        //so it reduces radius if chunks aren't loaded yet
        let meteor = dim.spawnEntity("cosmos:fallen_meteor", {x: px + x, y: 255, z: pz + z})
        let projectile = meteor.getComponent("minecraft:projectile");
        projectile.gravity = 0.03999999910593033;
        projectile.shoot({x: motX, y: 0, z: motZ})
    }
}

world.afterEvents.projectileHitBlock.subscribe(({projectile, dimension}) => {
    if(projectile.typeId == "cosmos:fallen_meteor" && (projectile.location.y <= 255 && projectile.location.y > -64)){
        dimension.createExplosion(projectile.location, 0.2)
        dimension.getBlock(projectile.location).setPermutation(
            BlockPermutation.resolve("cosmos:fallen_meteor", {"cosmos:heat_level": 1}));
        projectile.remove();
    }
});
world.afterEvents.itemUse.subscribe(({source, itemStack}) => {
    if(itemStack?.typeId == 'minecraft:stick'){
        let dim = source.dimension;
        let {x, y, z} = source.location;
        let meteor = dim.spawnEntity("cosmos:fallen_meteor", {x: x, y: y + 5, z: z})
        let projectile = meteor.getComponent("minecraft:projectile");
        projectile.gravity = 0.03999999910593033;
        projectile.shoot({x: 1, y: 0, z: 1})
    }
});