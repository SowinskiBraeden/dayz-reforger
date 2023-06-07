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
              balance: GuildDB.startingBalance,
            }
          }
        }

        // Register bank for user  
        let newBank = new User();
        newBank.createUser(interaction.member.user.id, GuildDB.serverID, GuildDB.startingBalance);
        newBank.save().catch(err => {
          if (err) return client.sendInternalError(interaction, err);
        });
        
      } else banking = banking.user;

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
          let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

          if (!targetUserBanking) {
            targetUserBanking = {
              userID: targetUserID,
              guilds: {
                [GuildDB.serverID]: {
                  balance: GuildDB.startingBalance,
                }
              }
            }

            // Register bank for user  
            let newBank = new User();
            newBank.createUser(targetUserID, GuildDB.serverID, GuildDB.startingBalance, 0);
            newBank.save().catch(err => {
              if (err) return client.sendInternalError(interaction, err);
            });
            
          } else targetUserBanking = targetUserBanking.user;

          if (!client.exists(targetUserBanking.guilds[GuildDB.serverID])) {
            const success = addUser(targetUserBanking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
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
          
        if (banking.guilds[GuildDB.serverID].balance.toFixed(2) - args[0].options[1].value < 0) {
          let embed = new EmbedBuilder()
            .setTitle('**Bank Notice:** NSF. Non sufficient funds')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [embed] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].balance - args[0].options[1].value;
      
        client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newBalance}}, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        const targetUserID = args[0].options[0].value.replace('<@!', '').replace('>', '');
        let targetUserBanking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

        if (!targetUserBanking) {
          targetUserBanking = {
            userID: targetUserID,
            guilds: {
              [GuildDB.serverID]: {
                balance: (GuildDB.startingBalance + args[0].options[1].value),
              }
            }
          }

          client.dbo.collection("users").insertOne(targetUserBanking, function(err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else targetUserBanking = targetUserBanking.user;
      
        const newTargetBalance = targetUserBanking.guilds[GuildDB.serverID].balance + args[0].options[1].value;

        client.dbo.collection("users").updateOne({"user.userID":targetUserID},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newTargetBalance}}, function(err, res) {
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