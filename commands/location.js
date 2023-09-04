const { EmbedBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "location",
  debug: false,
  global: false,
  description: "Find your last known location",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
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
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });
      }

      let playerStat = GuildDB.playerstats.find(stat => stat.discordID == interaction.member.user.id );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** You haven't linked your gamertag and are unable to use this command.`)], flags: (1 << 6) });

      let newDt = await client.getDateEST(playerStat.time);
      let unixTime = Math.floor(newDt.getTime()/1000);

      let lastLocation = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Location - <t:${unixTime}>**\nYour last location was detected at **[${playerStat.pos[0]}, ${playerStat.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${playerStat.pos[0]};${playerStat.pos[1]})**`)
    
      return interaction.send({ embeds: [lastLocation], flags: (1 << 6) });
    },
  },
}