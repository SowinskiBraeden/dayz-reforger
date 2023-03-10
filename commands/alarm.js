const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "alarm",
  debug: false,
  global: false,
  description: "Create a Zone Ping Alarm",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },  
  options: [
    {
      name: "create",
      description: "Create a new Zone Ping Alarm",
      value: "create",
      type: 1,
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
        {
          name: "radius",
          description: "Radius of Zone Alarm",
          value: "radius",
          type: 10,
          min_value: 25.00,
          required: true,
        },
        {
          name: "name",
          description: "Zone Alarm Name",
          value: "name",
          type: 3,
          required: true,
        },
        {
          name: "channel",
          description: "Channel for Zone Alarm Pings",
          value: "channel",
          type: 7,
          required: true,
        },
        {
          name: "role",
          description: "Role to Ping on Zone Alarm",
          value: "role",
          type: 8,
          required: true,
        }
      ]
    },
    {
      name: "delete",
      description: "Delete a Zone Alarm",
      value: "delete",
      type: 1,
      options: [{
        name: "name",
        description: "Name of the Zone Alarm to Delete",
        value: "name",
        type: 3,
        required: true,
      }]
    },
    {
      name: "add-player",
      description: "Add Player to be Ignored in a Zone Alarm Pings",
      value: "add-player",
      type: 1,
      options: [{
        name: "alarm-name",
        description: "Name of the Zone Alarm to add player to",
        value: "alarm-name",
        type: 3,
        required: true,
      }, {
        name: "gamertag",
        description: "Gamertag of Player to Ignore",
        value: "gamertag",
        type: 3,
        required: true,
      }]
    },
    {
      name: "remove-player",
      description: "Remove a Player from being Ignored in a Zone Alarm Pings",
      value: "remove-player",
      type: 1,
      options: [{
        name: "alarm-name",
        description: "Name of the Zone Alarm to add player to",
        value: "alarm-name",
        type: 3,
        required: true,
      }, {
        name: "gamertag",
        description: "Gamertag of Player to Ignore",
        value: "gamertag",
        type: 3,
        required: true,
      }]
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
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (GuildDB.hasBotAdmin && interaction.member.roles.filter(e => GuildDB.botAdminRoles.indexOf(e) !== -1).length > 0) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      if (args[0].name == 'create') {
        if (args[0].options[3].value.includes('-') || args[0].options[3].value.includes(' ')) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('**Invalid Name:** Alarm Names cannot include hyphens or spaces.')] })

        let alarm = {
          origin: [args[0].options[0].value, args[0].options[1].value],
          radius: args[0].options[2].value,
          name: args[0].options[3].value,
          channel: args[0].options[4].value,
          role: args[0].options[5].value,
          ignoredPlayers: [],
        };

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $push: {
            'server.alarms': alarm,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interacion, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully set **${alarm.name}** in <#${alarm.channel}>`);

        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'delete') {

        let alarm = GuildDB.alarms.find(alarm => alarm.name == args[0].options[0].value);
        if (!alarm) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription(`**Not Found!** Alarm ${args[0].options[0].value} is not an existing alarm name.`)] });

        const prompt = new EmbedBuilder()
          .setTitle(`Are you sure you want to delete this Zone Alarm?`)
          .setColor(client.config.Colors.Default)

        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`DeleteAlarm-yes-${args[0].options[0].value}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`DeleteAlarm-no-${args[0].options[0].value}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Success)
          )

        return interaction.send({ embeds: [prompt], components: [opt], flags: (1 << 6) });

      } else if (args[0].name == 'add-player') {
        let alarm = GuildDB.alarms.find(alarm => alarm.name == args[0].options[0].value);
        if (!alarm) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription(`**Not Found!** Alarm ${args[0].options[0].value} is not an existing alarm name.`)] });
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
      
        let playerStat = GuildDB.playerstats.find(stat => stat.player == args[0].options[1].value)
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before.')] })
      
        alarm.ignoredPlayers.push(playerStat.playerID);

        GuildDB.alarms[alarmIndex] = alarm;

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interacion, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully added **${args[0].options[1].value}** to **${alarm.name}**`);

        return interaction.send({ embeds: [successEmbed] });
      } else if (args[0].name == 'remove-player') {

        let alarm = GuildDB.alarms.find(alarm => alarm.name == args[0].options[0].value);
        if (!alarm) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription(`**Not Found!** Alarm ${args[0].options[0].value} is not an existing alarm name.`)] });
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
      
        let playerStat = GuildDB.playerstats.find(stat => stat.player == args[0].options[1].value)
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before.')] })
        if (!alarm.includes(playerStat.playerID)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This Player is not added to the Ignored Player list for the Zone Alarm **${alarm.name}**`)] })
        
        alarm.ignoredPlayers = alarm.ignoredPlayers.filter(function(value, index, arr){ 
          return value != args[0].options[1].value;
        });

        GuildDB.alarms[alarmIndex] = alarm;

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interacion, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully added **${args[0].options[1].value}** to **${alarm.name}**`);

        return interaction.send({ embeds: [successEmbed] });
      }
    },
  },

  Interactions: {
    DeleteAlarm: {
      run: async(client, interaction, GuildDB) => {

        if (interaction.customId.split('-')[1] == 'yes') {
          let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.customId.split('-')[2]);
  
          client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
            $pull: {
              'server.alarms': alarm,
            }
          }, function (err, res) {
            if (err) return client.sendInternalError(interacion, err);
          });
  
          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`**Success:** Successfully Deleted **${interaction.customId.split('-')[2]}**`);
  
          return interaction.send({ embeds: [successEmbed] });
        } else {
          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`The Zone Alarm **${interaction.customId.split('-')[2]}** will not be deleted.`);
  
          return interaction.send({ embeds: [successEmbed] });
        }
      }
    }
  } 
}
