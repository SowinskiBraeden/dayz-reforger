const { EmbedBuilder } = require('discord.js');
const { destinations } = require('../database/destinations');
const { calculateVector } = require('../util/Vector');

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
      let playerStat = await client.dbo.collection("players").findOne({"discordID": interaction.member.user.id});
      if (!client.exists(playerStat)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** You haven't linked your gamertag and are unable to use this command.`)], flags: (1 << 6) });

      let newDt = await client.getDateEST(playerStat.time);
      let unixTime = Math.floor(newDt.getTime()/1000);

      let tempDest;
      let lastDist = 1000000;
      let destination_dir;
      if (showCoords) { // Only calculate if showing coords, very tiny minor optimization... probably amounts to nothing.
        for (let i = 0; i < destinations.length; i++) {
          let { distance, theta, dir } = calculateVector(info.victimPOS, destinations[i].coord);
          if (distance < lastDist) {
            tempDest = destinations[i].name;
            lastDist = distance;
            destination_dir = dir;
          }
        }
      }
  
      const destination = lastDist > 500 ? `${destination_dir} of ${tempDest}` : `Near ${tempDest}`;
  
      let lastLocation = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Location - <t:${unixTime}>**\nYour last location was detected at **[${playerStat.pos[0]}, ${playerStat.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${playerStat.pos[0]};${playerStat.pos[1]})**\n${destination}`)
    
      return interaction.send({ embeds: [lastLocation], flags: (1 << 6) });
    },
  },
}