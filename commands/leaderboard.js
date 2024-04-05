const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

module.exports = {
  name: "leaderboard",
  debug: false,
  global: false,
  description: "View server stats leaderboard",
  usage: "[category] [limit]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "category",
    description: "Leaderboard Category",
    value: "category",
    type: CommandOptions.String,
    required: true,
    choices: [
      { name: "Money", value: "money" },
      { name: "Total Time Played", value: "totalSessionTime" },
      { name: "Longest Game Session", value: "longestSessionTime" },
      { name: "Kills", value: "kills" }, 
      { name: "Kill Streak", value: "killStreak" },
      { name: "Best Kill Streak", value: "bestKillStreak" },
      { name: "Deaths", value: "deaths" },
      { name: "Death Streak", value: "deathStreak" },
      { name: "Worst Death Streak", value: "worstDeathStreak" },
      { name: "Longest Kill", value: "longestKill" },
      { name: "KDR", value: "KDR" },
      { name: "Server Connections", value: "connections" },
      { name: "Shots Landed", value: "shotsLanded" },
      { name: "Times Shot", value: "timesShot" },
      { name: "Combat Rating", value: "combatRating" },
    ]
  }, {
    name: "limit",
    description: "Leaderboard limit",
    value: "limit",
    type: CommandOptions.Integer,
    min_value: 1,
    max_value: 25,
    required: true,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }
      
      const category = args[0].value;
      const limit = args[1].value;

      let leaderboard = [];
      if (category == 'money') {

        leaderboard = await client.dbo.collection("users").aggregate([
          { $sort: { [`user.guilds.${GuildDB.serverID}.balance`]: -1 } }
        ]).toArray();

      } else {
        
        leaderboard = await client.dbo.collection("players").aggregate([
          { $sort: { [`${category}`]: -1 } }
        ]).toArray();

      }
      
      let leaderboardEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default);
      
      let title = category == 'kills' ? "Total Kills Leaderboard" :
        category == 'killStreak' ? "Current Killstreak Leaderboard" :
        category == 'bestKillStreak' ? "Best Killstreak Leaderboard" :
        category == 'deaths' ? "Total Deaths Leaderboard" :
        category == 'deathStreak' ? "Current Deathstreak Leaderboard" :
        category == 'worstDeathStreak' ? "Worst Deathstreak Leaderboard" : 
        category == 'longestKill' ? "Longest Kill Leaderboard" : 
        category == 'money' ? "Money Leaderboard" : 
        category == 'totalSessionTime' ? "Total Time Played" : 
        category == 'longestSessionTime' ? "Longest Game Session" : 
        category == 'KDR' ? "Kill Death Ratio" : 
        category == 'connections' ? "Times Connected" : 
        category == 'shotsLanded' ? "Shots Landed" :
        category == 'timesShot' ? "Times Shot" :
        category == 'combatRating' ? "Combat Rating" : 'N/A Error';

      leaderboardEmbed.setTitle(`**${title} - DayZ Reforger**`);

      let des = ``;
      for (let i = 0; i < limit; i++) {
        if (leaderboard.length < limit && i == leaderboard.length) break;
        
        let stats = category == 'kills' ? `${leaderboard[i].kills} Kill${(leaderboard[i].kills>1||leaderboard[i].kills==0)?'s':''}` :
                    category == 'killStreak' ? `${leaderboard[i].killStreak} Player Killstreak` :
                    category == 'bestKillStreak' ? `${leaderboard[i].bestKillStreak} Player Killstreak` :
                    category == 'deaths' ? `${leaderboard[i].deaths} Death${leaderboard[i].deaths>1||leaderboard[i].deaths==0?'s':''}` :
                    category == 'deathStreak' ? `${leaderboard[i].deathStreak} Deathstreak` :
                    category == 'worstDeathstreak' ? `${leaderboard[i].worstDeathStreak} Deathstreak` :
                    category == 'longestKill' ? `${leaderboard[i].longestKill}m` : 
                    category == 'money' ? `$${(leaderboard[i].user.guilds[GuildDB.serverID].balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
                    category == 'totalSessionTime' ? `**Total:** ${client.secondsToDhms(leaderboard[i].totalSessionTime)}\n> **Last Session:** ${client.secondsToDhms(leaderboard[i].lastSessionTime)}` : 
                    category == 'longestSessionTime' ? `**Longest Game Session:** ${client.secondsToDhms(leaderboard[i].longestSessionTime)}` : 
                    category == 'KDR' ? `**KDR: ${leaderboard[i].KDR.toFixed(2)}**` : 
                    category == 'connection' ? `**Connections: ${leaderboard[i].connections}**` : 
                    category == 'combatRating' ? `**Combat Rating:** ${leaderboard[i].combatRating}` : 
                    category == 'shotsLanded' ? `**Shots Landed:** ${leaderboard[i].shotsLanded}` : 
                    category == 'timesShot' ? `**Times Shot:** ${leaderboard[i].timesShot}` : 'N/A Error';

        if (category == 'money') des += `**${i+1}.** <@${leaderboard[i].user.userID}> - **${stats}**\n`
        else if (category == 'totalSessionTime' || category == 'longestSessionTime' || category == 'combatRating') {
          tag = leaderboard[i].discordID != "" ? `<@${leaderboard[i].discordID}>` : leaderboard[i].gamertag;
          des += `**${i+1}.** ${tag}\n> ${stats}\n\n`;
        } else leaderboardEmbed.addFields({ name: `**${i+1}. ${leaderboard[i].gamertag}**`, value: `**${stats}**`, inline: true });
      }

      if (['money', 'totalSessionTime', 'longestSessionTime', 'combatRating'].includes(category)) leaderboardEmbed.setDescription(des);
      
      return interaction.send({ embeds: [leaderboardEmbed] });
    },
  },
}
