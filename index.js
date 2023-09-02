const DayzR = require('./structures/DayzRBot');
const config = require('./config/config');
const { GatewayIntentBits } = require('discord.js');

let client = new DayzR({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }, config);
client.build()
