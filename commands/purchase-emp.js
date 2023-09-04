const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user');

module.exports = {
  name: "purchase-emp",
  debug: false,
  global: false,
  description: "EMP an Alarm to prevent any updates for 30 minutes.",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
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

      if (banking.guilds[GuildDB.serverID].balance.toFixed(2) - GuildDB.empPrice < 0) {
        let embed = new EmbedBuilder()
          .setTitle('**Bank Notice:** NSF. Non sufficient funds')
          .setColor(client.config.Colors.Red);

        return interaction.send({ embeds: [embed], flags: (1 << 6) });
      }

      const newBalance = banking.guilds[GuildDB.serverID].balance - GuildDB.empPrice;
    
      if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to EMP.')], flags: (1 << 6) });

      client.dbo.collection("users").updateOne({"user.userID":interaction.member.user.id},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newBalance}}, (err, res) => {
        if (err) return client.sendInternalError(interaction, err);
      });
      
      let alarms = new StringSelectMenuBuilder()
        .setCustomId(`EMPAlarmSelect-${interaction.member.user.id}`)
        .setPlaceholder(`Select an Alarm to EMP.`)

      for (let i = 0; i < GuildDB.alarms.length; i++) {
        if (!alarm.empExempt) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `EMP this Alarm for $500,000`,
            value: GuildDB.alarms[i].name
          });
        }
      }

      const opt = new ActionRowBuilder().addComponents(alarms);

      return interaction.send({ components: [opt], flags: (1 << 6) });
    },
  },

  Interactions: {
    EMPAlarmSelect: {
      run: async (client, interaction, GuildDB) => {
        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarms = GuildDB.alarms;
        let alarmIndex = alarms.indexOf(alarm);
        alarm.disabled = true;
        let d = new Date();
        alarm.empExpire = new Date(d.getTime() += (30 * 60 * 1000));
        alarms[alarmIndex] = alarm;

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': alarms,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully EMP'd **${alarm.name}** for 30 minutes.`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    }
  }
}
