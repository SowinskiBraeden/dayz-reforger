const { ShardingManager } = require('discord.js');
const config = require('./config/config');

const manager = new ShardingManager('./bot.js', { token: config.Token });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
