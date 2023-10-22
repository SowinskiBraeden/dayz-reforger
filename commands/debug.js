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
  }, {
    name: 'server-connection-stats',
    description: 'view player connection stats',
    value: 'server-connection-stats',
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

      if (args[0].name == 'server-connection-stats') {
        let stats = GuildDB.playerstats;

        let statsEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle(`Server connection stats`);

        statsEmbed.addFields({ name: 'All time Unique connections', value: `> ${stats.length}`,  inline: false });

        let month3 = new Date().setMonth(new Date().getMonth() - 3);
        let month3Players = stats.filter((stat) => stat.lastConnectionDate > month3);
        statsEmbed.addFields({ name: 'Unique connections in the last 3 months', value: `> ${month3Players.length}`, inline: false });

        let month = new Date().setMonth(new Date().getMonth() - 1);
        let monthlyPlayers = stats.filter((stat) => stat.lastConnectionDate > month);
        statsEmbed.addFields({ name: 'Unique connections in the last month', value: `> ${monthlyPlayers.length}`, inline: false });

        let week = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
        let weeklyPlayers = stats.filter((stat) => stat.lastConnectionDate > week);
        statsEmbed.addFields({ name: 'Unique connections in the last week', value: `> ${weeklyPlayers.length}`, inline: false });

        let today = new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000)
        let dailyPlayers = stats.filter((stat) => stat.lastConnectionDate > today);
        statsEmbed.addFields({ name: 'Unique connections in the last 24 hours', value: `> ${dailyPlayers.length}`, inline: false });

        return interaction.send({ embeds: [statsEmbed] });
      }
    },
  },
  Interactions: {}
}