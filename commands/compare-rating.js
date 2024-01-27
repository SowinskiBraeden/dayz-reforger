const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const { insertPVPstats } = require('../database/player');

module.exports = {
  name: "compare-rating",
  debug: false,
  global: false,
  description: "Compare combat ratings between yourself and another player",
  usage: "[user or gamertag]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "discord",
    description: "Discord user to lookup stats",
    value: "discord",
    type: CommandOptions.User,
    required: false,
  }, {
    name: "gamertag",
    description: "Gamertag to lookup stats",
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
    run: async (client, interaction, args, { GuildDB }) => {
      let discord  = args[0] && args[0].name == 'discord'  ? args[0].value : undefined;
      let gamertag = args[0] && args[0].name == 'gamertag' ? args[0].value : undefined;

      if (!discord && !gamertag) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`Please provide a Discord User or Gamertag`)] });

      let leaderboard = await client.dbo.collection("players").aggregate([
        { $sort: { 'combatRating': -1 } }
      ]).toArray();

      let comp;
      if (discord) comp = leaderboard.find(s => s.discordID == discord);
      if (gamertag) comp = leaderboard.find(s => s.gamertag == gamertag); 
      let self = leaderboard.find(s => s.discordID == interaction.member.user.id);

      if (!client.exists(comp)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });
      if (!client.exists(self)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** You haven't linked your gamertag and your stats cannot be found.`)] });

      let lbPosSelf = leaderboard.indexOf(self) + 1;
      let lbPosComp = leaderboard.indexOf(comp) + 1;

      let selfData = self.combatRatingHistory;
      let compData = comp.combatRatingHistory;
      if (selfData.length == 1) selfData.push(self.combatRating) // Make array 2 long for a straight line in the graph
      if (compData.length == 1) compData.push(comp.combatRating) // Make array 2 long for a straight line in the graph
      let selfDataMax = Math.max(...selfData);
      let compDataMax = Math.max(...compData);

      if (!client.exists(self.highestCombatRating) || self.highestCombatRating < selfDataMax) self.highestCombatRating = selfDataMax;
      if (!client.exists(comp.highestCombatRating) || comp.highestCombatRating < compDataMax) comp.highestCombatRating = compDataMax;

      let tag = comp.discordID != "" ? `<@${comp.discordID}>` : comp.gamertag;

      let statsEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`<@${interaction.member.user.id}> vs ${tag} Combat Rating`)
        .addFields(
          { name: `${self.gamertag}'s Combat Rating Stats`, value: `> Leaderboard Pos: # ${lbPosSelf}\n> Rating: ${self.combatRating}`, inline: false },
          { name: `${comp.gamertag}'s Combat Rating Stats`, value: `> Leaderboard Pos: # ${lbPosComp}\n> Rating: ${comp.combatRating}`, inline: false },
          { name: 'Rating Difference', value: `${Math.abs(self.combatRating - comp.combatRating)}`, inline: false },
        );

      const dataMax = Math.max(selfDataMax, compDataMax);
      const dataMin = Math.min(Math.min(...selfData), Math.min(...compData))

      const len = Math.max(selfData.length, compData.length);
      const diff = Math.abs(selfData.length - compData.length);
      if (selfData.length < compData.length) selfData.unshift(...(new Array(diff).fill(null, 0, diff)));
      if (compData.length < selfData.length) compData.unshift(...(new Array(diff).fill(null, 0, diff)));
      
      const chart = {
        type: 'line',
        data: {
          labels: new Array(len).fill(' ', 0, len),
          datasets: [
            {
              data: selfData,
              label: `${self.gamertag}'s Combat Ratings`,
            },
            {
              data: compData,
              label: `${comp.gamertag}'s Combat Ratings`,
            }
          ],
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
                // max: Math.round(dataMax / 10) * 10 + 10,
                // min: Math.round(dataMin / 10) * 10,
              },
            }],
          },
          // Gives a margin to the right of the whole graph
          layout: {
            padding: {
              right: 40,
            },
          },
        },
      };
      
      const encodedChart = encodeURIComponent(JSON.stringify(chart));
      const chartURL = `https://quickchart.io/chart?c=${encodedChart}&bkg=${encodeURIComponent("#ded8d7")}`;

      statsEmbed.setImage(chartURL);

      return interaction.send({ embeds: [statsEmbed] });
    },
  },
}