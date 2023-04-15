const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder } = require('discord.js');
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
          description: "The channel to configure",
          value: "channel",
          type: 7,
          channel_types: [0], // Restrict to text channel
          required: true,
        },
        {
          name: "role",
          description: "Role to Ping on Zone Alarm",
          value: "role",
          type: 8,
          required: true,
        },
        {
          name: "emp-exempt",
          description: "Is this Alarm Exempt to EMP Attacks?",
          value: false,
          type: 5,
          required: false,
        },
        {
          name: "show-player-coords",
          description: "Show a players coords when in the zone",
          value: true,
          type: 5,
          required: false,
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
        name: "gamertag",
        description: "Gamertag of Player to Ignore",
        value: "gamertag",
        type: 3,
        required: true,
      }]
    },
    {
      name: "disable",
      description: "Disable an Zone Alarm",
      value: "disable",
      type: 1,
    },
    {
      name: "enable",
      description: "Enable an Zone Alarm",
      value: "enable",
      type: 1,
    },
    {
      name: "set-rule",
      description: "Add a Rule to an Alarm",
      value: "set-rule",
      type: 1,
      options: [{
        name: "rule",
        description: "Rule to Add to an Alarm",
        value: "rule",
        type: 3,
        required: true,
        choices: [
          { name: 'Ban on Entry', value: 'ban_on_entry' },
          { name: 'Ban on Kill', value: 'ban_on_kill' }
        ]
      }]
    },
    {
      name: "remove-rule",
      description: "Remove a Rule from an Alarm",
      value: "remove-rule",
      type: 1,
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
          rules: [],
          empExempt: client.exists(args[0].options[6]) ? args[0].options[6].value : false,
          showPlayerCoord: client.exists(args[0].options[7]) ? args[0].options[7].value : true,
          disabled: false,
        };

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $push: {
            'server.alarms': alarm,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully set **${alarm.name}** in <#${alarm.channel}>`);

        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'delete') {

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to Delete.')] });

        let alarms = new SelectMenuBuilder()
          .setCustomId(`DeleteAlarmSelect-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to Delete.`)

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `Delete this Alarm`,
            value: GuildDB.alarms[i].name
          });
        }
        
        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });

      } else if (args[0].name == 'add-player' || args[0].name == 'remove-player') {
        
        let add = args[0].name == 'add-player';

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription(`**Notice:** No Existing Alarms to ${add?'Add':'Remove'} Player ${add?'to':'from'}.`)] });

        let alarms = new SelectMenuBuilder()
          .setCustomId(`ManageAlarmIgnored-${add?'add':'remove'}-${args[0].options[0].value}-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to ${add?'Add':'Remove'} Player ${add?'to':'from'}.`)

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `${add?'Add':'Remove'} Player ${add?'to':'from'} this Alarm`,
            value: GuildDB.alarms[i].name
          });
        }
        
        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });
      } else if (args[0].name == 'set-rule' || args[0].name == 'remove-rule') {

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let id = `ManageRule-${args[0].name=='set-rule'?'add':'remove'}${args[0].name=='set-rule'?`-${args[0].options[0].value}`:''}-${interaction.member.user.id}`

        let alarms = new SelectMenuBuilder()
          .setCustomId(id)
          .setPlaceholder(`Select an Alarm to configure.`)

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `Configure this Alarm`,
            value: GuildDB.alarms[i].name
          });
        }
        
        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });

      } else if (args[0].name == 'enable' || args[0].name == 'disable') {

        if (GuildDB.alarms.length == 0)  return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let disable = args[0].name == 'disable' ? true : false;

        let alarms = new SelectMenuBuilder()
          .setCustomId(`EnableOrDisableAlarm-${disable ? 'disable' : 'enable'}-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to ${disable ? 'disable' : 'enable'}.`);

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          if (disable && !GuildDB.alarms[i].disabled) {
            alarms.addOptions({
              label: GuildDB.alarms[i].name,
              description: `Disable this alarm`,
              value: GuildDB.alarms[i].name,
            })
          } else if (!disable && GuildDB.alarms[i].disabled) {
            alarms.addOptions({
              label: GuildDB.alarms[i].name,
              description: `Enable this alarm`,
              value: GuildDB.alarms[i].name,
            })
          }
        }

        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });

      }
    },
  },

  Interactions: {
    DeleteAlarmSelect: {
      run: async(client, interaction, GuildDB) => {

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);

        const prompt = new EmbedBuilder()
          .setTitle(`Are you sure you want to delete this Zone Alarm?`)
          .setColor(client.config.Colors.Default)

        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`DeleteAlarm-yes-${alarm.name}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`DeleteAlarm-no-${alarm.name}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Success)
          )

        return interaction.update({ embeds: [prompt], components: [opt], flags: (1 << 6) });
      }
    },
    DeleteAlarm: {
      run: async(client, interaction, GuildDB) => {

        if (interaction.customId.split('-')[1] == 'yes') {
          let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.customId.split('-')[2]);
  
          client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
            $pull: {
              'server.alarms': alarm,
            }
          }, function (err, res) {
            if (err) return client.sendInternalError(interaction, err);
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
    },
    ManageAlarmIgnored: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
      
        let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == interaction.customId.split('-')[2]);
        if (playerStat == undefined) return interaction.update({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before.')], components: [] });
      
        let add = interaction.customId.split('-')[1] == 'add';

        if (add) alarm.ignoredPlayers.push(playerStat.playerID);
        else alarm.ignoredPlayers = alarm.ignoredPlayers.filter((v) => { 
          return v != playerStat.playerID;
        });

        GuildDB.alarms[alarmIndex] = alarm;

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully ${add?'Added':'Removed'} **${interaction.customId.split('-')[2]}** ${add?'to':'from'} **${alarm.name}**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },
    ManageRule: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);

        if (interaction.customId.split('-')[1] == 'add') {

          alarm.rules.push(interaction.customId.split('-')[2]);
          GuildDB.alarms[alarmIndex] = alarm;

          client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
            $set: {
              'server.alarms': GuildDB.alarms,
            }
          }, function (err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });

          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`**Success:** Successfully Added Rule **${interaction.customId.split('-')[2]}** to **${alarm.name}**`);

          return interaction.update({ embeds: [successEmbed], components: [] });

        } else if (interaction.customId.split('-')[1]=='remove') {

          let alarmRules = new SelectMenuBuilder()
            .setCustomId(`DeleteAlarmRule-${alarm.name}-${interaction.member.user.id}`)
            .setPlaceholder(`Select Rule to Remove from ${alarm.name}`);

          for (let i = 0; i < alarm.rules.length; i++) {
            alarmRules.addOptions({
              label: alarm.rules[i],
              description: `Select this Rule to remove it.`,
              value: alarm.rules[i]
            });
          }
          
          const opt = new ActionRowBuilder().addComponents(alarmRules);

          return interaction.update({ components: [opt], flags: (1 << 6) });
        }
      }
    },
    DeleteAlarmRule: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.customId.split('-')[1]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);

        alarm.rules = alarm.rules.filter((v) => {
          return v != interaction.values[0];
        });

        GuildDB.alarms[alarmIndex] = alarm;

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully Removed Rule **${interaction.values[0]}** from **${interaction.customId.split('-')[1]}**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },
    EnableOrDisableAlarm: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
        let disable = interaction.customId.split('-')[1] == 'disable' ? true : false;
        alarm.disabled = disable;
        GuildDB.alarms[alarmIndex] = alarm

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully ${disable ? 'disabled' : 'enabled'} the Alarm **${interaction.values[0]}**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    }
  } 
}
