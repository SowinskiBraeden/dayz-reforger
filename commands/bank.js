const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const { createUser, addUser } = require('../database/user');

module.exports = {
  name: "bank",
  debug: false,
  global: false,
  description: "Manage your banking",
  usage: "[command] [options]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "balance",
      description: "View your bank balance and count your cash",
      value: "balance",
      type: CommandOptions.SubCommand,
      options: [{
        name: "user",
        description: "User to view ballance",
        value: "user",
        type: CommandOptions.User,
        required: false,
      }]
    },
    {
      name: "transfer",
      description: "Transfer directly to users bank",
      value: "transfer",
      type: CommandOptions.SubCommand,
      options: [
        {
          name: "user",
          description: "User to transfer to",
          value: "user",
          type: CommandOptions.User,
          required: true,
        },
        {
          name: "amount",
          description: "The amount to transfer",
          value: "amount",
          type: CommandOptions.Float,
          min_value: 0.01,
          required: true,
        },
      ]
    }
  ],
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

      if (args[0].name == 'balance') {
        let balanceEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default);

        if (args[0].options&&args[0].options[0]) {
          // Show target users balance

          let targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');
          let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(targetUserBanking => targetUserBanking);

          if (!targetUserBanking) {
            targetUserBanking = await createUser(targetUserID, GuildDB.serverID, GuildDB.startingBalance, client)
            if (!client.exists(banking)) return client.sendInternalError(interaction, err);
          }
          targetUserBanking = targetUserBanking.user;
    
          if (!client.exists(targetUserBanking.guilds[GuildDB.serverID])) {
            const success = addUser(banking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
            if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
          }

          // This lame line of code to get username without ping on discord
          const DiscordUser = client.users.cache.get(targetUserID);

          balanceEmbed.setTitle(`${DiscordUser.tag.split("#")[0]}'s Bank Records`);
          balanceEmbed.addFields({ name: '**Bank**', value: `$${targetUserBanking.guilds[GuildDB.serverID].balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, inline: true });

        } else {
          // Show command authors balance

          balanceEmbed.setTitle('Personal Bank Records');
          balanceEmbed.addFields({ name: '**Bank**', value: `$${banking.guilds[GuildDB.serverID].balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, inline: true });
        }

        return interaction.send({ embeds: [balanceEmbed] });

      } else if (args[0].name == 'transfer') {
        // send money from bank

        // prevent sending transfering money to self
        const targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');

        if (targetUserID == interaction.member.user.id) return interaction.send({ embeds: [new EmbedBuilder().setDescription('**Invalid** You may not transfer money to yourself').setColor(client.config.Colors.Yellow)], flags: (1 << 6) })

        if (banking.guilds[GuildDB.serverID].balance.toFixed(2) - args[0].options[1].value < 0) {
          let embed = new EmbedBuilder()
            .setTitle('**Bank Notice:** NSF. Non sufficient funds')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [embed] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].balance - args[0].options[1].value;

        client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newBalance}}, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(targetUserBanking => targetUserBanking);

        if (!targetUserBanking) {
          targetUserBanking = await createUser(targetUserID, GuildDB.serverID, GuildDB.startingBalance, client)
          if (!client.exists(banking)) return client.sendInternalError(interaction, err);
        }
        targetUserBanking = targetUserBanking.user;
  
        if (!client.exists(targetUserBanking.guilds[GuildDB.serverID])) {
          const success = addUser(banking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
          if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
        }

        const newTargetBalance = targetUserBanking.guilds[GuildDB.serverID].balance + args[0].options[1].value;

        client.dbo.collection("users").updateOne({"user.userID":targetUserID},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newTargetBalance}}, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        const successEmbed = new EmbedBuilder()
          .setTitle('Bank Notice:')
          .setDescription(`Successfully transfered <@${targetUserID}> **$${args[0].options[1].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}**`)
          .setColor(client.config.Colors.Green);

        return interaction.send({ embeds: [successEmbed] });
      }
    },
  },
}