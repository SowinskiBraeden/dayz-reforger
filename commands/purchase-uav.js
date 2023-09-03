const { EmbedBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user')

module.exports = {
  name: "purchase-uav",
  debug: false,
  global: false,
  description: "Send a UAV to scout for 30 minutes. (500m range)",
  usage: "[x-coord] [y-coord]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  options: [
    {
      name: "x-coord",
      description: "X Coordinate of the origin",
      value: "x-coord",
      type: 10,
      min_value: 0.01,
      required: true,
    },
    {
      name: "y-coord",
      description: "Y Coordinate of the origin",
      value: "y-coord",
      type: 10,
      min_value: 0.01,
      required: true,
    },
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

        // Register bank for user  
        let newBank = new User();
        newBank.createUser(interaction.member.user.id, GuildDB.serverID, GuildDB.startingBalance, 0);
        newBank.save().catch(err => {
          if (err) return client.sendInternalError(interaction, err);
        });
        
      } else banking = banking.user;

      if (!client.exists(banking.guilds[GuildDB.serverID])) {
        const success = addUser(banking.guilds, GuildDB.serverID, interaction.member.user.id, client, GuildDB.startingBalance);
        if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
      }

      if (banking.guilds[GuildDB.serverID].balance.toFixed(2) - GuildDB.uavPrice < 0) {
        let embed = new EmbedBuilder()
          .setTitle('**Bank Notice:** NSF. Non sufficient funds')
          .setColor(client.config.Colors.Red);

        return interaction.send({ embeds: [embed], flags: (1 << 6) });
      }

      const newBalance = banking.guilds[GuildDB.serverID].balance - GuildDB.uavPrice;
    
      client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newBalance}}, function(err, res) {
        if (err) return client.sendInternalError(interaction, err);
      });

      let uav = {
        origin: [args[0].value, args[1].value],
        radius: 250,
        owner: interaction.member.user.id,
        creationDate: new Date(),
      };

      client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
        $push: {
          'server.uavs': uav,
        }
      }, function (err, res) {
        if (err) return client.sendInternalError(interaction, err);
      });

      let successEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Green)
        .setDescription(`**Success:** Successfully deployed a UAV to **[${uav.origin[0]}, ${uav.origin[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${uav.origin[0]};${uav.origin[1]})**\nRange: 500m`);

      return interaction.send({ embeds: [successEmbed], flags: (1 << 6) });
    },
  }
}
