const { EmbedBuilder } = require('discord.js');
const { nearest } = require('../database/destinations');

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

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth) || !client.exists(GuildDB.Nitrado.Mission)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }

      let playerStat = await client.dbo.collection("players").findOne({"discordID": interaction.member.user.id});
      if (!client.exists(playerStat)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** You haven't linked your gamertag and are unable to use this command.`)], flags: (1 << 6) });
      if (!client.exists(playerStat.time)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** There is no location saved to your gamertag yet. Make sure you've logged into the server for more than **5 minutes.**`)], flags: (1 << 6)});

      console.log(true);

      let newDt = await client.getDateEST(playerStat.time);
      let unixTime = Math.floor(newDt.getTime()/1000);
  
      const destination = nearest(playerStat.pos, GuildDB.Nitrado.Mission);
  
      let lastLocation = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Location - <t:${unixTime}>**\nYour last location was detected at **[${playerStat.pos[0]}, ${playerStat.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${playerStat.pos[0]};${playerStat.pos[1]})**\n${destination}`)
    
      return interaction.send({ embeds: [lastLocation], flags: (1 << 6) });
    },
  },
}