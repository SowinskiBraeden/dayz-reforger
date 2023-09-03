const fs = require("fs");
const path = require("path");
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

/**
 * Register slash commands for a guild
 * @param {require("../structures/DayzRBot")} client
 */
module.exports = {
  // Register guild commands  
  RegisterGuildCommands: async (client, guild) => {
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, "..", "commands")).filter(file => file.endsWith('.js'));

    // Place your client and guild ids here
    const clientId = client.application.id;
    const guildId = guild;

    for (const file of commandFiles) {
      const command = require(`../commands/${file}`);
      if (!commands.global) commands.push(command); // don't include global commands
    }

    const rest = new REST({ version: '10' }).setToken(client.config.Token);

    try {
      client.log(`[${guildId}] Started refreshing guild (/) commands.`);

      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );

      client.log(`[${guildId}] Successfully reloaded guild (/) commands.`);
    } catch (error) {
      client.error(error);
    }
  },

  // Register global commands
  RegisterGlobalCommands: async (client) => {
    const commands = [];
    const commandFiles = fs.readdirSync(path.join(__dirname, "..", "commands")).filter(file => file.endsWith('.js'));

    // Place your client and guild ids here
    const clientId = client.application.id;

    for (const file of commandFiles) {
      const command = require(`../commands/${file}`);
      if (command.global) commands.push(command);
    }

    const rest = new REST({ version: '10' }).setToken(client.config.Token); 

    try {
      client.log('[global] Started refreshing global (/) commands.');

      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );

      client.log('[global] Successfully reloaded global (/) commands.');
    } catch (error) {
      client.error(error);
    }
  }
};