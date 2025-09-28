import { ShardingManager } from "discord.js";
import config from "./config/config";

// ShardingManager spawns node instances and we need to explicitely point to dist/bot.js
const manager: ShardingManager = new ShardingManager("./dist/bot.js", { token: config.Token });

manager.on("shardCreate", shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
