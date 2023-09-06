const DayzR = require('./structures/DayzRBot');
const config = require('./config/config');
const { GatewayIntentBits } = require('discord.js');

const path = require("path");
const fs = require('fs');

let client = new DayzR({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] }, config);
client.build()

// Log all uncaught exceptions before killing process.
process.on('uncaughtException', async (error) => {
    let d = new Date();
    // Asynchronously write the error message to a log file using Promises
    await new Promise((resolve, reject) => {
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

    // Now, you can re-throw the error
    process.exit()
});
