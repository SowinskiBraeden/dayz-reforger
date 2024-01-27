const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

module.exports = {
  name: "debug",
  debug: true,
  global: false,
  description: "debugging...",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: 'sync-logs',
    description: 'download the Nitrado logs and run checks now',
    value: 'sync-logs',
    type: CommandOptions.SubCommand,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (!client.config.Admins.includes(interaction.member.user.id)) return interaction.send({ content: 'Only developers can access this command.', flags: (1 << 6) })
      
      if (args[0].name == 'sync-logs') {
        if (client.processingLogs) return interaction.send({ content: 'The Nitrado logs are already being processed at the moment...', flags: (1 << 6) });
        interaction.send({ content: 'Downloading and processing Nitrado logs now...', flags: (1 << 6) });
        return client.logsUpdateTimer(client);
      }
    },
  },
  Interactions: {}
}