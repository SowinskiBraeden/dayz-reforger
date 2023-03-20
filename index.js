const DayzArmbands = require('./structures/DayzArmbands');
const config = require('./config/config');
const { GatewayIntentBits } = require('discord.js');

let client = new DayzArmbands({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }, config);
client.build()
