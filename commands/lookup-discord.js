const { EmbedBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "lookup-discord",
  debug: false,
  global: false,
  description: "Search for a users discord from a gamertag",
  usage: "[gamertag]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "gamertag",
    description: "Gamertag of player",
    value: "gamertag",
    type: 3,
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

      let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].value );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

      if (client.exists(playerStat.discordID)) {
        const found = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Record Found**\n> The gamertag \` ${playerStat.gamertag} \` is currently linked to <@${playerStat.discordID}>.`)
        
        return interaction.send({ embeds: [found] });
      }

      let notFound = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Record Not Found**\n The gamertag \` ${playerStat.gamertag} \` currently has no linked Discord account.`);

      return interaction.send({ embeds: [notFound] })
    },
  },
}