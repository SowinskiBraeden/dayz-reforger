const DayzR = require('./src/DayzRBot');
const config = require('./config/config');
const { GatewayIntentBits } = require('discord.js');

const path = require("path");
const fs = require('fs');
const { HandleActivePlayersList } = require('./util/LogsHandler');

// Log all uncaught exceptions before killing process.
process.on('uncaughtException', async (error) => {
	console.trace(error);
	let d = new Date();
	// Asynchronously write the error message to a log file using Promises
	await new Promise((resolve, reject) => {
		if (HandleActivePlayersList.lastSendMessage) HandleActivePlayersList.lastSendMessage.delete().catch(error => client.sendError(channel, `HandleActivePlayersList Error: \n${error}`));  // Remove previous embed message before closing
		fs.appendFile(path.join(__dirname, "./logs/Logs.log"), 
		`{"level":"error","message":"${d.getHours()}:${d.getMinutes()} - ${d.getMonth()+1}:${d.getDate()}:${d.getFullYear()} | uncaughtException: ${error.stack}"}`, (logErr) => {
			if (logErr) {
				console.error('Error writing uncaughtException to log file:', logErr);
				reject(logErr);
				process.exit()
			} else {
				resolve();
			}
		});
	});

	// Now gracefully close the program
	process.exit()
});

let client = new DayzR({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }, config);
client.build()
