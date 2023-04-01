const { EmbedBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "money",
  debug: false,
  global: false,
  description: "add/remove money from user",
  usage: "[opt.] [user] [amount]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  options: [
    {
      name: "add",
      description: "Add money to user",
      value: "add",
      type: 1,
      options: [
        {
          name: "amount",
          description: "The amount to add to balance",
          value: "amount",
          type: 10,
          min_value: 0.01,
          required: true,
        },
        {
          name: "to",
          description: "User to alter balance",
          value: "to",
          type: 6,
          required: true,
        },
      ]
    },
    {
      name: "remove",
      description: "Remove or remove money from a user",
      value: "remove",
      type: 1,
      options: [
        {
          name: "amount",
          description: "The amount to add to balance",
          value: "amount",
          type: 10,
          min_value: 0.01,
          required: true,
        },
        {
          name: "from",
          description: "User to alter balance",
          value: "from",
          type: 6,
          required: true,
        },
      ]
    },
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
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (client.exists(GuildDB.botAdmin) && interaction.member.roles.includes(GuildDB.botAdmin)) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      const targetUserID = args[0].options[1].value.replace('<@!', '').replace('>', '');
      let banking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

      if (!banking) {
        banking = {
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
        await newBank.createUser(targetUserID, GuildDB.serverID, GuildDB.startingBalance, 0);
        await newBank.save().catch(err => {
          if (err) return client.sendInternalError(interaction, err);
        });
        
      } else banking = banking.user;

      if (!client.exists(banking.guilds[GuildDB.serverID])) {
        const success = addUser(banking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
        if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
      }

      let newBalance = args[0].name == 'add'
                        ? banking.guilds[GuildDB.serverID].bankAccount.balance + args[0].options[0].value
                        : banking.guilds[GuildDB.serverID].bankAccount.balance - args[0].options[0].value;
    
      client.dbo.collection("users").updateOne({"user.userID":targetUserID},{$set:{[`user.guilds.${GuildDB.serverID}.bankAccount.balance`]:newBalance}}, function(err, res) {
        if (err) return client.sendInternalError(interaction, err);
      });
    
      const successEmbed = new EmbedBuilder()
        .setDescription(`Successfully ${args[0] == 'add' ? 'added' : 'removed'} $${args[0].options[0].value.toFixed(2)} ${args[0] == 'add' ? 'to' : 'from'} <@${targetUserID}>'s balance`)
        .setColor(client.config.Colors.Green);

      return interaction.send({ embeds: [successEmbed] });
    },
  },
}