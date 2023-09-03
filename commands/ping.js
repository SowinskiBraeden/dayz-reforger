const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "ping",
  debug: true,
  global: true,
  description: "Test bot activity",
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
      const end = new Date().getTime();
      const pingEmbed = new EmbedBuilder()
        .setDescription(`🏓 **Pong!** Bot ping: ${end - start}ms`)
        .setColor(client.config.Colors.Default);
  
      return interaction.send({ embeds: [pingEmbed] });
    },
  },
}