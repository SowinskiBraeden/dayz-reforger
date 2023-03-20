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
    run: async (client, interaction, args, { GuildDB }, start) => {
        
      let activePlayers = GuildDB.playerstats.filter(p => p.connected);

      let des = ``;
      for (let i = 0; i < activePlayers.length; i++) {
        des += `**- ${activePlayers[i].gamertag}\n`;
      }

      const activePlayersEmbed = new EmbedBuilder()
        .setColor(this.config.Colors.Default)
        .setTitle(`Online List - ${activePlayers.length} Player${(activePlayers.length>1||activePlayers.length==0)?'s':''} Online`)
        .setDescription(des);

      return interaction.send({ embeds: [activePlayersEmbed] });
    },
  },
}