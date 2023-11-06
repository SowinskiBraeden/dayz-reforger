const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const { insertPVPstats } = require('../database/player');

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
      { name: "Shots Landed", value: "shotsLanded" },
      { name: "Times Shot", value: "timesShot" },
      { name: "Combat Rating", value: "combatRating" }
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
      let discord  = args[1] && args[1].name == 'discord'  ? args[1].value : undefined;
      let gamertag = args[1] && args[1].name == 'gamertag' ? args[1].value : undefined;
      let self = !discord && !gamertag; // searching for self if both discord and gamertag are undefined;
      
      let query;
      let leaderboard;
      let leaderboardPos;

      if (category == 'money') {

        leaderboard = await client.dbo.collection("users").aggregate([
          { $sort: { [`user.guilds.${GuildDB.serverID}.balance`]: -1 } }
        ]).toArray();

        if (discord) query = leaderboard.find(u => u.user.userID == discord);                 // Searching by discord user
        if (gamertag) query = leaderboard.find(u => u.user.userID == playerStat.discordID);   // Searching by gamertag
        if (self) query = leaderboard.find(u => u.user.userID == interaction.member.user.id); // Searching for self

        if (!client.exists(query)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });
        leaderboardPos = leaderboard.indexOf(query);

      } else {
        
        leaderboard = await client.dbo.collection("players").aggregate([
          { $sort: { [`${category}`]: -1 } }
        ]).toArray();

        if (discord) query = leaderboard.find(s => s.discordID == discord);                 // Searching by discord user
        if (gamertag) query = leaderboard.find(s => s.gamertag == gamertag);                // Searching by gamertag
        if (self) query = leaderboard.find(s => s.discordID == interaction.member.user.id); // Searching for self

        if (!client.exists(query)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });
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
        category == 'connections' ? "Times Connected" : 
        category == 'shotsLanded' ? "Shots Landed" :
        category == 'timesShot' ? "Times Shot" :
        category == 'combatRating' ? "Combat Rating" : 'N/A Error';

      let statsEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default);

      let tag = !discord && !gamertag ? `<@${interaction.member.user.id}>` :
                !gamertag && discord ? `<@${discord}>` :
                !discord && gamertag ? `**${gamertag}**` : `N/A Error`;

      statsEmbed.setDescription(`${tag}'s ${title}`);

      let stats = category == 'kills' ? `${query.kills} Kill${(query.kills>1||query.kills==0)?'s':''}` :
                  category == 'killStreak' ? `${query.killStreak} Player Killstreak` :
                  category == 'bestKillStreak' ? `${query.bestKillStreak} Player Killstreak` :
                  category == 'deaths' ? `${query.deaths} Death${query.deaths>1||query.deaths==0?'s':''}` :
                  category == 'deathStreak' ? `${query.deathStreak} Deathstreak` :
                  category == 'worstDeathStreak' ? `${query.worstDeathStreak} Deathstreak` :
                  category == 'longestKill' ? `${query.longestKill}m` : 
                  category == 'money' ? `$${(query.user.guilds[GuildDB.serverID].balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :  
                  category == 'KDR' ? `${query.KDR.toFixed(2)} KDR` : 
                  category == 'connections' ? `${query.connections} connections` : 
                  category == 'combatRating' ? `${query.combatRating}` : 'N/A Error';

      statsEmbed.addFields({ name: 'Leaderboard Position', value: `# ${leaderboardPos}`, inline: true });
      
      if ((category == 'shotsLanded' || category == 'timesShot') && !client.exists(query.shotsLanded)) query = insertPVPstats(query);

      if (category == 'totalSessionTime') {
        statsEmbed.addFields(
          { name: 'Total Time Played', value: client.secondsToDhms(query.totalSessionTime), inline: true },
          { name: 'Last Session Time', value: client.secondsToDhms(query.lastSessionTime), inline: true }
        );
      } else if (category == 'longestSessionTime') {
        statsEmbed.addFields(
          { name: 'Longest Game Session', value: client.secondsToDhms(query.longestSessionTime), inline: true },
          { name: 'Last Session Time', value: client.secondsToDhms(query.lastSessionTime), inline: true }
        );
      } else if (category == 'shotsLanded') { 
        statsEmbed.addFields(
          { name: 'Total Shots Landed', value: `${query.shotsLanded}`, inline: true },
          { name: 'View Weapon stats', value: `</weapon-stats:1169369568104415262>`, inline: true }
        );  

        const chart = {
          type: 'bar',
          data: {
            labels: ['Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'],
            datasets: [{
              label: 'Shots Landed',
              data: [
                query.shotsLandedPerBodyPart.Head,
                query.shotsLandedPerBodyPart.Torso,
                query.shotsLandedPerBodyPart.LeftArm,
                query.shotsLandedPerBodyPart.RightArm,
                query.shotsLandedPerBodyPart.LeftLeg,
                query.shotsLandedPerBodyPart.RightLeg,
              ],
            }],
          },
          options: {
            legend: {
              labels: {
                fontSize: 14,
                fontStyle: 'bold',
              }
            },
            scales: {
              yAxes: [{ ticks: { fontStyle: 'bold' } }],
              xAxes: [{ ticks: { fontStyle: 'bold' } }],
            },
          },
        };
        
        const encodedChart = encodeURIComponent(JSON.stringify(chart));
        const chartURL = `https://quickchart.io/chart?bkg=${encodeURIComponent("#ded8d7")}&c=${encodedChart}`;
        
        statsEmbed.setImage(chartURL);

      } else if (category == 'timesShot') { 
        statsEmbed.addFields(
          { name: 'Total Times Shot', value: `${query.timesShot}`, inline: true },
          { name: 'View Weapon stats', value: `</weapon-stats:1169369568104415262>`, inline: true },
        );
    
        const chart = {
          type: 'bar',
          data: {
            labels: ['Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'],
            datasets: [{
              label: 'Times Shot',
              data: [
                query.timesShotPerBodyPart.Head,
                query.timesShotPerBodyPart.Torso,
                query.timesShotPerBodyPart.LeftArm,
                query.timesShotPerBodyPart.RightArm,
                query.timesShotPerBodyPart.LeftLeg,
                query.timesShotPerBodyPart.RightLeg,
              ],
            }],
          },
          options: {
            legend: {
              labels: {
                fontSize: 14,
                fontStyle: 'bold',
              }
            },
            scales: {
              yAxes: [{ ticks: { fontStyle: 'bold' } }],
              xAxes: [{ ticks: { fontStyle: 'bold' } }],
            },
          },
        };
        
        const encodedChart = encodeURIComponent(JSON.stringify(chart));
        const chartURL = `https://quickchart.io/chart?bkg=${encodeURIComponent("#ded8d7")}&c=${encodedChart}`;
        
        statsEmbed.setImage(chartURL);
    
      } else if (category == 'combatRating') {

        let data = query.combatRatingHistory;

        statsEmbed.addFields({ name: 'Combat Rating', value: `${query.combatRating}`, inline: true });

        if (data.length == 1) data.push(query.combatRating) // Make array 2 long for a straight line in the graph

        const chart = {
          type: 'line',
          data: {
            labels: new Array(data.length).fill(' ', 0, data.length),
            datasets: [{
              data: data,
              label: 'Combat Rating Over Time',
            }],
          },
          options: {
            legend: {
              labels: {
                fontSize: 14,
                fontStyle: 'bold',
              }
            },
            scales: {
              // Gives comfortable margin to the top of the y-axis
              yAxes: [{
                ticks: {
                  fontStyle: 'bold',
                  min: Math.round(Math.min(...data)/10)*10 - 10,
                  max: Math.round(Math.max(...data)/10)*10 + 10,
                },
              }],
              xAxes: [{ ticks: { fontStyle: 'bold' } }],
            },
            // Gives a margin to the right of the whole graph
            layout: {
              padding: {
                right: 40,
              },
            },
            // Labels points on the graph to show evolution of combat rating
            plugins: {
              datalabels: {
                display: true,
                align: 'top',
                color: '#000',
                backgroundColor: '#ccc',
                borderRadius: 4,
                offset: 10,
                display: (context) => {
                  const index = context.dataIndex;
                  const value = context.dataset.data[index];
                  const min = Math.min.apply(null, context.dataset.data);
                  const max = Math.max.apply(null, context.dataset.data);
                  return (
                    index == 0 ||
                    index == context.dataset.data.length - 1 ||
                    value == min ||
                    value == max
                  );
                },
              },
            },
          },
        };

        const encodedChart = encodeURIComponent(JSON.stringify(chart));
        const chartURL = `https://quickchart.io/chart?bkg=${encodeURIComponent("#ded8d7")}&c=${encodedChart}`;

        statsEmbed.setImage(chartURL);

      } else statsEmbed.addFields({ name: title, value: stats, inline: true });
 
      return interaction.send({ embeds: [statsEmbed] });
    },
  },
}