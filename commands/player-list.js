const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "player-list",
  debug: false,
  global: false,
  description: "Get current online players",
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

      let activePlayers = await client.dbo.collection("players").find({"connected": true});

      let des = activePlayers.length > 0 ? `` : `**No Players Online**`;
      for (let i = 0; i < activePlayers.length; i++) {
        des += `**- ${activePlayers[i].gamertag}**\n`;
      }

      const activePlayersEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle(`Online List - ${activePlayers.length} Player${(activePlayers.length>1||activePlayers.length==0)?'s':''} Online`)
        .setDescription(des);

      return interaction.send({ embeds: [activePlayersEmbed] });
    },
  },
}