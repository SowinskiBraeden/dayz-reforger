const { EmbedBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user');

module.exports = {
  name: "bank",
  debug: false,
  global: false,
  description: "Manage your banking",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "deposit",
      description: "Deposit cash into your bank",
      value: "deposit",
      type: 1,
      options: [{
        name: "amount",
        description: "Amount to deposit",
        value: "amount",
        type: 10,
        min_value: 0.01,
        required: true,
      }]
    },
    {
      name: "withdraw",
      description: "Withdraw cash from you bank",
      value: "deposit",
      type: 1,
      options: [{
        name: "amount",
        description: "Amount to withdraw",
        value: "amount",
        type: 10,
        min_value: 0.01,
        required: true,
      }]
    },
    {
      name: "balance",
      description: "View your bank balance and count your cash",
      value: "balance",
      type: 1,
      options: [{
        name: "user",
        description: "User to view ballance",
        value: "user",
        type: 6,
        required: false,
      }]
    },
    {
      name: "give",
      description: "Give a user cash",
      value: "give",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to give cash to",
          value: "user",
          type: 6,
          required: true,
        },
        {
          name: "amount",
          description: "The amount to give",
          value: "amount",
          type: 10,
          min_value: 0.01,
          required: true,
        },
      ]
    },
    {
      name: "transfer",
      description: "Transfer directly to users bank",
      value: "transfer",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to transfer to",
          value: "user",
          type: 6,
          required: true,
        },
        {
          name: "amount",
          description: "The amount to transfer",
          value: "amount",
          type: 10,
          min_value: 0.01,
          required: true,
        },
      ]
    }
  ],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
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
        banking = {
          userID: interaction.member.user.id,
          guilds: {
            [GuildDB.serverID]: {
              bankAccount: {
                balance: GuildDB.startingBalance,
                cash: 0.00,
              }
            }
          }
        }

        // Register inventory for user  
        let newBank = new User();
        newBank.createBank(interaction.member.user.id, GuildDB.serverID, GuildDB.startingBalance, 0);
        newBank.save().catch(err => {
          if (err) return client.sendInternalError(interaction, err);
        });
        
      } else banking = banking.banking;

      if (!client.exists(banking.guilds[GuildDB.serverID])) {
        const success = addUser(banking.guilds, GuildDB.serverID, interaction.member.user.id, client, GuildDB.startingBalance);
        if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
      }

      if (args[0].name == 'deposit') {
        if (banking.guilds[GuildDB.serverID].bankAccount.cash.toFixed(2) - args[0].options[0].value < 0) {
          const nsf = new EmbedBuilder()
            .setDescription('**Bank Notice:** NSF. Non sufficient funds')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [nsf] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].bankAccount.balance + args[0].options[0].value;
        const newCash = Math.abs(banking.guilds[GuildDB.serverID].bankAccount.cash.toFixed(2) - args[0].options[0].value);
      
        client.dbo.collection("users").updateOne({ "user.userID": interaction.member.user.id }, {
          $set: {
            [`banking.guilds.${GuildDB.serverID}.bankAccount.balance`]: newBalance,
            [`banking.guilds.${GuildDB.serverID}.bankAccount.cash`]: newCash
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        const successEmbed = new EmbedBuilder()
          .setTitle('Bank Notice:')
          .setDescription(`Successfully deposited **$${args[0].options[0].value.toFixed(2)}**\nUse \`/bank balance\` to view your balance`)
          .setColor(client.config.Colors.Green);
        
        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'withdraw') {
        if (args[0].options[0].value > banking.guilds[GuildDB.serverID].bankAccount.balance) {
          let nsf = new EmbedBuilder()
            .setDescription('**Bank Notice:** NSF. Non sufficient funds')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [nsf] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].bankAccount.balance - args[0].options[0].value;
        const newCash = banking.guilds[GuildDB.serverID].bankAccount.cash + args[0].options[0].value;
      
        client.dbo.collection("users").updateOne({ "user.userID": interaction.member.user.id }, {
          $set: {
            [`banking.guilds.${GuildDB.serverID}.bankAccount.balance`]: newBalance,
            [`banking.guilds.${GuildDB.serverID}.bankAccount.cash`]: newCash
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });
        
        const successEmbed = new EmbedBuilder()
          .setTitle('Bank Notice:')
          .setDescription(`Successfully withdrew **$${args[0].options[0].value.toFixed(2)}**\nUse \`/bank balance\` or \`/inventory wallet\` to view your cash balance`)
          .setColor(client.config.Colors.Green);
        
        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'balance') {
        let balanceEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default);

        if (args[0].options&&args[0].options[0]) {
          // Show target users balance

          let targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');
          let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

          if (!targetUserBanking) {
            targetUserBanking = {
              userID: targetUserID,
              guilds: {
                [GuildDB.serverID]: {
                  bankAccount: {
                    balance: GuildDB.startingBalance,
                    cash: 0.00,
                  }
                }
              }
            }

            // Register inventory for user  
            let newBank = new User();
            newBank.createBank(targetUserID, GuildDB.serverID, GuildDB.startingBalance, 0);
            newBank.save().catch(err => {
              if (err) return client.sendInternalError(interaction, err);
            });
            
          } else targetUserBanking = targetUserBanking.banking;

          if (!client.exists(targetUserBanking.guilds[GuildDB.serverID])) {
            const success = addUser(targetUserBanking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
            if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
          }

          // This lame line of code to get username without ping on discord
          const User = client.users.cache.get(targetUserID);

          balanceEmbed.setTitle(`${User.tag}'s Bank Records`);
          balanceEmbed.addFields(
            { name: '**Bank**', value: `$${targetUserBanking.guilds[GuildDB.serverID].bankAccount.balance}`, inline: true },
            { name: '**Cash**', value: `$${targetUserBanking.guilds[GuildDB.serverID].bankAccount.cash}`, inline: true });

        } else {
          // Show command authors balance

          balanceEmbed.setTitle('Personal Bank Records');
          balanceEmbed.addFields(
            { name: '**Bank**', value: `$${banking.guilds[GuildDB.serverID].bankAccount.balance.toFixed(2)}`, inline: true },
            { name: '**Cash**', value: `$${banking.guilds[GuildDB.serverID].bankAccount.cash.toFixed(2)}`, inline: true },
            { name: '**Total**', value: `$${(banking.guilds[GuildDB.serverID].bankAccount.balance + banking.guilds[GuildDB.serverID].bankAccount.cash).toFixed(2)}`, inline: true });
        }

        return interaction.send({ embeds: [balanceEmbed] });

      } else if (args[0].name == 'give') {
         // send money from wallet

        if (banking.guilds[GuildDB.serverID].bankAccount.cash.toFixed(2) - args[0].options[1].value < 0) {
          let embed = new EmbedBuilder()
            .setTitle('Non sufficient funds! Withdraw more cash')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [embed] });
        }

        const newCash = banking.guilds[GuildDB.serverID].bankAccount.cash - args[0].options[1].value;
      
        client.dbo.collection("users").updateOne({ "user.userID": interaction.member.user.id }, {
          $set: {
            [`banking.guilds.${GuildDB.serverID}.bankAccount.cash`]: newCash
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        const targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');
        let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);
        
        let newTargetCash = targetUserBanking.guilds[GuildDB.serverID].bankAccount.cash + args[0].options[1].value;

        if (!targetUserBanking) {
          targetUserBanking = {
            userID: targetUserID,
            guilds: {
              [GuildDB.serverID]: {
                bankAccount: {
                  balance: GuildDB.startingBalance,
                  cash: newTargetCash,
                }
              }
            }
          }

          // Register inventory for user  
          let newBank = new User();
          newBank.createBank(targetUserID, GuildDB.serverID, GuildDB.startingBalance, newTargetCash);
          newBank.save().catch(err => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else targetUserBanking = targetUserBanking.banking;

        if (!client.exists(targetUserBanking.guilds[GuildDB.serverID])) {
          const success = addUser(targetUserBanking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
          if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
        }
        
        const successEmbed = new EmbedBuilder()
          .setTitle('Success')
          .setDescription(`Successfully gave <@${targetUserID}> $${args[0].options[1].value.toFixed(2)}`)
          .setColor(client.config.Colors.Green);

        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'transfer') {
        // send money from bank
          
        if (banking.guilds[GuildDB.serverID].bankAccount.balance.toFixed(2) - args[0].options[1].value < 0) {
          let embed = new EmbedBuilder()
            .setTitle('Non sufficient funds! Withdraw more cash')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [embed] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].bankAccount.balance - args[0].options[1].value;
      
        client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`banking.guilds.${GuildDB.serverID}.bankAccount.balance`]:newBalance}}, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        const targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');
        let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

        if (!targetUserBanking) {
          targetUserBanking = {
            userID: targetUserID,
            guilds: {
              [GuildDB.serverID]: {
                bankAccount: {
                  balance: (GuildDB.startingBalance + args[0].options[1].value),
                  cash: 0.00,
                }
              }
            }
          }

          client.dbo.collection("users").insertOne(targetUserBanking, function(err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else targetUserBanking = targetUserBanking.banking;
      
        const newTargetBalance = targetUserBanking.guilds[GuildDB.serverID].bankAccount.balance + args[0].options[1].value;

        client.dbo.collection("users").updateOne({"user.userID":targetUserID},{$set:{[`banking.guilds.${GuildDB.serverID}.bankAccount.balance`]:newTargetBalance}}, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });
        
        const successEmbed = new EmbedBuilder()
          .setTitle('Bank Notice:')
          .setDescription(`Successfully transfered <@${targetUserID}> $${args[0].options[1].value.toFixed(2)}`)
          .setColor(client.config.Colors.Green);

        return interaction.send({ embeds: [successEmbed] });        
      }
    },
  },
}