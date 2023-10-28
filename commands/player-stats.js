const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

module.exports = {
  name: "player-stats",
  debug: false,
  global: false,
  description: "Check player statistics",
  usage: "[category] [user or gamertag]",
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
    ]
  }, {
    name: "discord",
    description: "discord user to lookup stats",
    value: "discord",
    type: CommandOptions.User,
    required: false,
  }, {
    name: "gamertag",
    description: "gamertag to lookup stats",
    type: CommandOptions.String,
    required: false,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }, start) => {
      let category = args[0].value;
      let discord  = args[1] && args[1].name == 'discord'  ? args[1].value : undefined
      let gamertag = args[1] && args[1].name == 'gamertag' ? args[1].value : undefined;

      let playerStat;
      if (!discord && gamertag) {
        playerStat = await client.dbo.collection("players").findOne({"gamertag": gamertag});
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });
      }

      let query;
      let leaderboard;
      let leaderboardPos;

      if (category == 'money') {

        const usersCursor = await client.dbo.collection("users").aggregate([
          { $sort: { [`user.guilds.${GuildDB.serverID}.balance`]: -1 } }
        ]);

        for await (const user of usersCursor) {
          leaderboard.push(user);
        }


        if (discord) { // If searching by discord
          query = leaderboard.find(u => u.user.userID == discord);

        } else if (gamertag) { // If searching by gamertag
          if (playerStat.discordID == "") return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Unlinked** No Discord User has linked to the gamertag \` ${gamertag} \`.`)] });
          query = leaderboard.find(u => u.user.userID == playerStat.discordID);
        
        } else { // If searching for self
          query = leaderboard.find(u => u.user.userID == interaction.member.user.id);
        }

        if (query == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });
        leaderboardPos = leaderboard.indexOf(query);

      } else {
        
        const playersCursor = await client.dbo.collection("players").aggregate([
          { $sort: { [`${category}`]: -1 } }
        ]);

        for await (const player of playersCursor) {
          leaderboard.push(player);
        }

        if (discord) { // If searching by discord
          query = leaderboard.find(s => s.discordID == discord);

        } else if (gamertag ) { // If searching by gamertag
          query = leaderboard.find(s => s.gamertag == gamertag);
        
        } else { // If searching for self
          query = leaderboard.find(s => s.discordID == interaction.member.user.id);
        }

        if (query == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });
        leaderboardPos = leaderboard.indexOf(query);

      }
      leaderboardPos++; // add one to leaderboard pos because it is index in array and we want index zero to be num. one, index one to be num. two, etc. etc.

      let title = category == 'kills' ? "Total Kills" :
        category == 'killStreak' ? "Current Killstreak" :
        category == 'bestkillStreak' ? "Best Killstreak" :
        category == 'deaths' ? "Total Deaths" :
        category == 'deathStreak' ? "Current Deathstreak" :
        category == 'worstDeathStreak' ? "Worst Deathstreak" : 
        category == 'longestKill' ? "Longest Kill" : 
        category == 'money' ? "Total Money" : 
        category == 'totalSessionTime' ? "Total Time Played" :
        category == 'longestSessionTime' ? "Longest Game Session" :
        category == 'KDR' ? "Kill Death Ratio" :
        category == 'connections' ? "Times Connected" : 'N/A Error';

      let statsEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default);

      let tag = !discord && !gamertag ? `<@${interaction.member.user.id}>` :
                !gamertag && discord ? `<@${discord}>` :
                !discord && gamertag ? `**${gamertag}**` : `N/A Error`;

      statsEmbed.setDescription(`${tag}'s ${title}`);

      let des = ``;
      let stats = category == 'kills' ? `${query.kills} Kill${(query.kills>1||query.kills==0)?'s':''}` :
                  category == 'killStreak' ? `${query.killStreak} Player Killstreak` :
                  category == 'bestKillStreak' ? `${query.bestKillStreak} Player Killstreak` :
                  category == 'deaths' ? `${query.deaths} Death${query.deaths>1||query.deaths==0?'s':''}` :
                  category == 'deathStreak' ? `${query.deathStreak} Deathstreak` :
                  category == 'worstDeathStreak' ? `${query.worstDeathStreak} Deathstreak` :
                  category == 'longestKill' ? `${query.longestKill}m` : 
                  category == 'money' ? `$${(query.user.guilds[GuildDB.serverID].balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :  
                  category == 'KDR' ? `${query.KDR.toFixed(2)} KDR` : 
                  category == 'connections' ? `${query.connections} connections` : 'N/A Error';

      statsEmbed.addFields({ name: 'Leaderboard Position', value: `# ${leaderboardPos}`, inline: true });
      
      if (category == 'total_time_played') {
        statsEmbed.addFields(
          { name: 'Total Time Played', value: client.secondsToDhms(query.totalSessionTime), inline: true },
          { name: 'Last Session Time', value: client.secondsToDhms(query.lastSessionTime), inline: true }
        );
      } else if (category == 'longest_time_played') {
        statsEmbed.addFields(
          { name: 'Longest Game Session', value: client.secondsToDhms(query.longestSessionTime), inline: true },
          { name: 'Last Session Time', value: client.secondsToDhms(query.lastSessionTime), inline: true }
        );
      } else statsEmbed.addFields({ name: title, value: stats, inline: true });
 
      return interaction.send({ embeds: [statsEmbed] });
    },
  },
}