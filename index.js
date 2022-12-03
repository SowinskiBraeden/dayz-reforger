const Applicantz = require('./structures/Applicantz');
const config = require('./config/config');
const { GatewayIntentBits } = require('discord.js');

let client = new Applicantz({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] }, config);
client.build()
