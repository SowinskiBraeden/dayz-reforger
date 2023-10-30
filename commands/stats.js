const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

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
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }, start) => {
      let package = JSON.parse(fs.readFileSync('../package.json'));

      const end = new Date().getTime();
      const stats = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle('DayZ Reforger Bot Statistics')
        .addFields(
          { name: 'Latency', value: `${end - start}ms`, inline: true },
          { name: 'Uptime', value: `${client.secondsToDhms(process.uptime().toFixed(2))}`, inline: true },
          { name: 'Bot Version', value: `${client.config.Dev} v${client.config.Version}`, inline: true },
          { name: 'Discord Version', value: `Discord.js ${package.dependencies["discord.js"]}`, inline: true },
          { name: 'MongoDB Version', value: `MongoDB    ${package.dependencies.mongodb}`, inline: true},
        )
      
      return interaction.send({ embeds: [stats] })
    },
  },
}