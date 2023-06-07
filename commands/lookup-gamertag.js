const { EmbedBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "lookup-gamertag",
  debug: false,
  global: false,
  description: "Search for a users linked gamertag",
  usage: "[user]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "user",
    description: "Discord User",
    value: "user",
    type: 6,
    required: true,
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

      if (!client.exists(GuildDB.playerstats)) {
        GuildDB.playerstats = [{}];
        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            "server.playerstats": []
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });
      }

      let playerStat = GuildDB.playerstats.find(stat => stat.discordID == args[0].value );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** The user <@${args[0].value}> has not linked a gamertag.`)] });

      const found = new EmbedBuilder()
        .setColor(client.config.Colors.Yellow)
        .setDescription(`**Record Found**\n> The user <@${playerStat.discordID}> has linked the gamertag \` ${playerStat.gamertag} \`.`)
      
      return interaction.send({ embeds: [found], components: [opt] });
    },
  },
}