const { EmbedBuilder, } = require('discord.js');
const { createUser, addUser } = require('../database/user');

module.exports = {
  name: "collect-income",
  debug: false,
  global: false,
  description: "Collect your income",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send({ content: `You are not allowed to use the bot in this channel.`,  flags: (1 << 6) }); 
      }

      const hasIncomeRole = GuildDB.incomeRoles.some(data => {
        if (interaction.member.roles.includes(data.role)) return true;
        return false;
      });

      if (!hasIncomeRole) {
        const error = new EmbedBuilder()
          .setColor(client.config.Colors.Red)
          .setTitle('Missing Income!')
          .setDescription(`It appears you don't have any income`)

        return interaction.send({ embeds: [error] })
      }

      let banking = await client.dbo.collection("users").findOne({"user.userID": interaction.member.user.id}).then(banking => banking);

      
      if (!banking) {
        banking = await createUser(interaction.member.user.id, GuildDB.serverID, GuildDB.startingBalance, client)
        if (!client.exists(banking)) return client.sendInternalError(interaction, err);
      }
      banking = banking.user;

      if (!client.exists(banking.guilds[GuildDB.serverID])) {
        const success = addUser(banking.guilds, GuildDB.serverID, interaction.member.user.id, client, GuildDB.startingBalance);
        if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
      }

      if (!client.exists(banking.guilds[GuildDB.serverID].lastIncome)) banking.guilds[GuildDB.serverID].lastIncome = new Date('2000-01-01T00:00:00');
      
      let now = new Date();
      let diff = (now - banking.guilds[GuildDB.serverID].lastIncome) / 1000;
      diff /= (60 * 60);
      let hoursBetweenDates = Math.abs(Math.round(diff));

      if (hoursBetweenDates >= GuildDB.incomeLimiter) {
        let roles = [];
        let income = [];
        for (let i = 0; i < GuildDB.incomeRoles.length; i++) {
          if (interaction.member.roles.includes(GuildDB.incomeRoles[i].role)) {
            roles.push(GuildDB.incomeRoles[i].role)
            income.push(GuildDB.incomeRoles[i].income)
          }
        }

        let totalIncome = income.reduce((x, y) => x + y, 0)

        let newData = banking.guilds[GuildDB.serverID];
        newData.balance += totalIncome;
        newData.lastIncome = now;

        client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`user.guilds.${GuildDB.serverID}`]: newData}}, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let description = `**You collected**`;
        for (let i = 0; i < roles.length; i++) {
          description += `\n<@&${roles[i]}> - $**${income[i].toFixed(2).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}**`
        }

        const success = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(description)

        return interaction.send({ embeds: [success] })

      } else {
        let date = banking.guilds[GuildDB.serverID].lastIncome;
        date.setHours(date.getHours() + GuildDB.incomeLimiter);
        diff = (date - now) / 1000;
        let timeTillIncome = client.secondsToDhms(diff);
        
        const error = new EmbedBuilder()
          .setColor(client.config.Colors.Red)
          .setDescription(`You've already collected your income this week. Wait **${timeTillIncome}** to collect again.`);

        return interaction.send({ embeds: [error] })
      }
    },
  },
}