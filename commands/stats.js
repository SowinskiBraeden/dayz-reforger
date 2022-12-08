const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "stats",
  debug: true,
  global: true,
  description: "check bot statistics",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [],  
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      const end = new Date().getTime();
      const stats = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle('QuarksBot Statistics')
        .addFields(
          { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
          { name: 'Users', value: `${client.users.cache.size}`, inline: true },
          { name: 'Latency', value: `${end - start}ms`, inline: true },
          { name: 'Uptime', value: `${client.secondsToDhms(process.uptime().toFixed(2))}`, inline: true },
          { name: 'Bot Version', value: `${client.config.Dev} v${client.config.Version}`, inline: true },
          { name: 'Discord Version', value: 'Discord.js v14.3.0', inline: true },
        )
      
      return interaction.send({ embeds: [stats] })
    },
  },
}