const { EmbedBuilder } = require('discord.js');

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
    type: 3,
    required: true,
    choices: [
      { name: "money", value: "money" },
      { name: "time_played", value: "time_played" },
      { name: "kills", value: "kills" }, 
      { name: "killstreak", value: "killstreak" },
      { name: "best_killstreak", value: "best_killstreak" },
      { name: "deaths", value: "deaths" },
      { name: "deathstreak", value: "deathstreak" },
      { name: "worst_deathstreak", value: "worst_deathstreak" },
      { name: "longest_kill", value: "longest_kill" },
    ]
  }, {
    name: "discord",
    description: "discord user to lookup stats",
    value: "discord",
    type: 6,
    required: false,
  }, {
    name: "gamertag",
    description: "gamertag to lookup stats",
    type: 3,
    required: false,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
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
        playerStat = GuildDB.playerstats.find(stat => stat.gamertag == gamertag );
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });
      }

      let query;
      let leaderboard;
      let leaderboardPos;
      if (category == 'money') {

        let users = await client.dbo.collection("users").find({}).toArray();

        leaderboard = users.sort(function(a, b) {
          return b.user.guilds[GuildDB.serverID].balance - a.user.guilds[GuildDB.serverID].balance;
        });

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
        
        leaderboard = GuildDB.playerstats.sort(function(a, b){
          if (category == 'kills') return b.kills - a.kills;
          if (category == 'killstreak') return b.killStreak - a.killStreak;
          if (category == 'best_killstreak') return b.bestKillStreak - a.bestKillStreak;
          if (category == 'deaths') return b.deaths - a.deaths;
          if (category == 'deathstreak') return b.deathStreak - a.deathSreak;
          if (category == 'worst_deathstreak') return b.worstDeathStreak - a.worstDeathStreak;
          if (category == 'longest_kill') return b.longestKill - a.longestKill;
          if (category == 'time_played') return b.totalSessionTime - a.totalSessionTime;
        });

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
        category == 'killstreak' ? "Current Killstreak" :
        category == 'best_killstreak' ? "Best Killstreak" :
        category == 'deaths' ? "Total Deaths" :
        category == 'deathstreak' ? "Current Deathstreak" :
        category == 'worst_deathstreak' ? "Worst Deathstreak" : 
        category == 'longest_kill' ? "Longest Kill" : 
        category == 'money' ? "Total Money" : 
        category == 'time_played' ? "Time Played" : 'N/A Error';

      let statsEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default);

      let tag = !discord && !gamertag ? `<@${interaction.member.user.id}>` :
                !gamertag && discord ? `<@${discord}>` :
                !discord && gamertag ? `**${gamertag}**` : `N/A Error`;

      statsEmbed.setDescription(`${tag}'s ${title}`);

      let des = ``;
      let stats = category == 'kills' ? `${query.kills} Kill${(query.kills>1||query.kills==0)?'s':''}` :
                  category == 'killstreak' ? `${query.killStreak} Player Killstreak` :
                  category == 'best_killstreak' ? `${query.bestKillStreak} Player Killstreak` :
                  category == 'deaths' ? `${query.deaths} Death${query.deaths>1||query.deaths==0?'s':''}` :
                  category == 'deathstreak' ? `${query.deathStreak} Deathstreak` :
                  category == 'worst_deathstreak' ? `${query.worstDeathStreak} Deathstreak` :
                  category == 'longest_kill' ? `${query.longestKill}m` : 
                  category == 'money' ? `$${(query.user.guilds[GuildDB.serverID].balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :  'N/A Error';

      statsEmbed.addFields({ name: 'Leaderboard Position', value: `# ${leaderboardPos}`, inline: true });
      
      if (category == 'time_played') {
        statsEmbed.addFields(
          { name: 'Total Time Played', value: client.secondsToDhms(query.totalSessionTime), inline: true },
          { name: 'Last Session Time', value: query.lastSessionTime, inline: true }
        );
      } else statsEmbed.addFields({ name: title, value: stats, inline: true });
 
      return interaction.send({ embeds: [statsEmbed] });
    },
  },
}