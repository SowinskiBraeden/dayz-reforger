const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "leaderboard",
  debug: false,
  global: false,
  description: "View server statistics leaderboard",
  usage: "[category] [limit]",
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
      { name: "kills", value: "kills" }, 
      { name: "killstreak", value: "killstreak" },
      { name: "best_killstreak", value: "best_killstreak" },
      { name: "deaths", value: "deaths" },
      { name: "deathstreak", value: "deathstreak" },
      { name: "worst_deathstreak", value: "worst_deathstreak" },
      { name: "longest_kill", value: "longest_kill" },
    ]
  }, {
    name: "limit",
    description: "leaderboard limit",
    value: "limit",
    type: 4,
    min_value: 1,
    max_value: 25,
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
      let category = args[0].value;

      let leaderboard;
      if (category == 'money') {

        let users = await client.dbo.collection("users").find({}).toArray();

        leaderboard = users.sort(function(a, b) {
          return b.user.guilds[GuildDB.serverID].balance - a.user.guilds[GuildDB.serverID].balance;
        });

      } else {
        
        leaderboard = GuildDB.playerstats.sort(function(a, b){
          if (category == 'kills') return b.kills - a.kills;
          if (category == 'killstreak') return b.killStreak - a.killStreak;
          if (category == 'best_killstreak') return b.bestKillStreak - a.bestKillStreak;
          if (category == 'deaths') return b.deaths - a.deaths;
          if (category == 'deathstreak') return b.deathStreak - a.deathSreak;
          if (category == 'worst_deathstreak') return b.worstDeathStreak - a.worstDeathStreak;
          if (category == 'longest_kill') return b.longestKill - a.longestKill;
        });

      }
      
      let limit = args[1].value > leaderboard.length ? leaderboard.length : args[1].value;
      
      let leaderboardEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default);
      
      let title = category == 'kills' ? "Total Kills Leaderboard" :
        category == 'killstreak' ? "Current Killstreak Leaderboard" :
        category == 'best_killstreak' ? "Best Killstreak Leaderboard" :
        category == 'deaths' ? "Total Deaths Leaderboard" :
        category == 'deathstreak' ? "Current Deathstreak Leaderboard" :
        category == 'worst_deathstreak' ? "Worst Deathstreak Leaderboard" : 
        category == 'longest_kill' ? "Longest Kill Leaderboard" : 
        category == 'money' ? "Money Leaderboard" : 'N/A Error';

      leaderboardEmbed.setTitle(`**${title} - DayZ Reforger**`);

      let des = ``;
      for (let i = 0; i < limit; i++) {
        let stats = category == 'kills' ? `${leaderboard[i].kills} Kill${leaderboard[i].kills>1||leaderboard[i].kills==0?'s':''}` :
                    category == 'killstreak' ? `${leaderboard[i].killStreak} Player Killstreak` :
                    category == 'best_killstreak' ? `${leaderboard[i].bestKillStreak} Player Killstreak` :
                    category == 'deaths' ? `${leaderboard[i].deaths} Death${leaderboard[i].deaths>1||leaderboard[i].deaths==0?'s':''}` :
                    category == 'deathstreak' ? `${leaderboard[i].deathStreak} Deathstreak` :
                    category == 'worst_deathstreak' ? `${leaderboard[i].worstDeathStreak} Deathstreak` :
                    category == 'longest_kill' ? `${leaderboard[i].longestKill}m` : 
                    category == 'money' ? `$${(leaderboard[i].user.guilds[GuildDB.serverID].balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A Error';

        if (category == 'money') des += `**${i+1}.** <@${leaderboard[i].user.userID}> - **${stats}**\n`
        else leaderboardEmbed.addFields({ name: `**${i+1}. ${leaderboard[i].gamertag}**`, value: `**${stats}**`, inline: true });
      }

      if (category == 'money') leaderboardEmbed.setDescription(des);
      
      return interaction.send({ embeds: [leaderboardEmbed] });
    },
  },
}
