const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "alarm",
  debug: false,
  global: false,
  description: "Manage an Alarm",
  usage: "[command] [options]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },  
  options: [
    {
      name: "create",
      description: "Create a new Zone Ping Alarm",
      value: "create",
      type: CommandOptions.SubCommand,
      options: [
        {
          name: "x-coord",
          description: "X Coordinate of the origin",
          value: "x-coord",
          type: CommandOptions.Float,
          min_value: 0.01,
          required: true,
        },
        {
          name: "y-coord",
          description: "Y Coordinate of the origin",
          value: "y-coord",
          type: CommandOptions.Float,
          min_value: 0.01,
          required: true,
        },
        {
          name: "radius",
          description: "Radius of Alarm",
          value: "radius",
          type: CommandOptions.Float,
          min_value: 25.00,
          required: true,
        },
        {
          name: "name",
          description: "Alarm Name",
          value: "name",
          type: CommandOptions.String,
          required: true,
        },
        {
          name: "channel",
          description: "Alarm Channel",
          value: "channel",
          type: CommandOptions.Channel,
          channel_types: [0], // Restrict to text channel
          required: true,
        },
        {
          name: "role",
          description: "Role to Ping on Alarm",
          value: "role",
          type: CommandOptions.Role,
          required: true,
        },
        {
          name: "emp-exempt",
          description: "Is this Alarm Exempt to EMP Attacks?",
          value: false,
          type: CommandOptions.Boolean,
          required: false,
        },
        {
          name: "show-player-coords",
          description: "Show a players coords when in the radius of the Alarm?",
          value: true,
          type: CommandOptions.Boolean,
          required: false,
        }
      ]
    },
    {
      name: "delete",
      description: "Delete an Alarm",
      value: "delete",
      type: CommandOptions.SubCommand,
    },
    {
      name: "add-player",
      description: "Add player to be ignored list of an Alarm",
      value: "add-player",
      type: CommandOptions.SubCommand,
      options: [{
        name: "gamertag",
        description: "Gamertag of player to ignore",
        value: "gamertag",
        type: CommandOptions.String,
        required: true,
      }]
    },
    {
      name: "remove-player",
      description: "Remove a player from the ignored list of an Alarm",
      value: "remove-player",
      type: CommandOptions.SubCommand,
      options: [{
        name: "gamertag",
        description: "Gamertag of player to ignore",
        value: "gamertag",
        type: CommandOptions.String,
        required: true,
      }]
    },
    {
      name: "disable",
      description: "Disable an Alarm",
      value: "disable",
      type: CommandOptions.SubCommand,
    },
    {
      name: "enable",
      description: "Enable an Alarm",
      value: "enable",
      type: CommandOptions.SubCommand,
    },
    {
      name: "mute",
      description: "Mute the role ping of an Alarm",
      value: "mute",
      type: CommandOptions.SubCommand,
      options: [{
        name: "toggle",
        description: "Turn on/off role pings for this alarm",
        value: false,
        type: CommandOptions.Boolean,
        required: true,
      }]
    },
    {
      name: "set-rule",
      description: "Add a Rule to an Alarm",
      value: "set-rule",
      type: CommandOptions.SubCommand,
      options: [{
        name: "rule",
        description: "Select a rule to add to an Alarm",
        value: "rule",
        type: CommandOptions.String,
        required: true,
        choices: [
          { name: 'Ban on Entry', value: 'ban_on_entry' },
          { name: 'Ban on Kill', value: 'ban_on_kill' },
          { name: 'Ban on Fireplace Placement', value: 'ban_on_fireplace_placement' },
        ]
      }]
    },
    {
      name: "remove-rule",
      description: "Remove a rule from an Alarm",
      value: "remove-rule",
      type: CommandOptions.SubCommand,
    },
    {
      name: "rename",
      description: "Rename an Alarm",
      value: "rename",
      type: CommandOptions.SubCommand,
      options: [{
        name: "name",
        description: "New Alarm Name",
        value: "name",
        type: CommandOptions.String,
        required: true,
      }]
    },
    {
      name: "move-origin",
      description: "Move the origin of an Alarm",
      value: "move-origin",
      type: CommandOptions.SubCommand,
      options: [{
        name: "x-coord",
        description: "X Coordinate of the new origin",
        value: "x-coord",
        type: CommandOptions.Float,
        min_value: 0.01,
        required: true,
      },
      {
        name: "y-coord",
        description: "Y Coordinate of the new origin",
        value: "y-coord",
        type: CommandOptions.Float,
        min_value: 0.01,
        required: true,
      }]
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
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (GuildDB.hasBotAdmin && interaction.member.roles.filter(e => GuildDB.botAdminRoles.indexOf(e) !== -1).length > 0) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }

      if (args[0].name == 'create') {
        if (args[0].options[3].value.includes('-') || args[0].options[3].value.includes(' ')) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('**Invalid Name:** Alarm Names cannot include hyphens or spaces.')] })

        let exists = undefined == GuildDB.alarms.find(alarm => alarm.name = args[0].options[3].value) ? true : false;
        if (exists) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Invalid Name**\nAn alarm already exists with this name.')]});

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
          empExpire: null,
        };

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $push: {
            'server.alarms': alarm,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully set **${alarm.name}** in <#${alarm.channel}>`);

        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'delete') {

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to Delete.')] });

        let alarms = new StringSelectMenuBuilder()
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

        let alarms = new StringSelectMenuBuilder()
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

        return interaction.send({ components: [opt] });
      } else if (args[0].name == 'set-rule' || args[0].name == 'remove-rule') {

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let id = `ManageRule-${args[0].name=='set-rule'?'add':'remove'}${args[0].name=='set-rule'?`-${args[0].options[0].value}`:''}-${interaction.member.user.id}`

        let alarms = new StringSelectMenuBuilder()
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

        let alarms = new StringSelectMenuBuilder()
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

      } else if (args[0].name == 'rename') {

        if (GuildDB.alarms.length == 0)  return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let disable = args[0].name == 'disable' ? true : false;

        let alarms = new StringSelectMenuBuilder()
          .setCustomId(`RenameAlarm-${args[0].options[0].value}-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to rename.`);

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `Rename this alarm`,
            value: GuildDB.alarms[i].name,
          })
        }

        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });

      } else if (args[0].name == 'move-origin') {

        if (GuildDB.alarms.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let alarms = new StringSelectMenuBuilder()
          .setCustomId(`MoveOrigin-${args[0].options[0].value}-${args[0].options[1].value}-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to move.`);

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `Move the Origin of this Alarm`,
            value: GuildDB.alarms[i].name,
          })
        }

        const opt = new ActionRowBuilder().addComponents(alarms);

        return interaction.send({ components: [opt], flags: (1 << 6) });

      } else if (args[0].name == 'mute') {

        if (GuildDB.alarms.length == 0)  return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Alarms to configure.')] });

        let alarms = new StringSelectMenuBuilder()
          .setCustomId(`MuteAlarm-${args[0].options[0].value ? 1 : 0}-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Alarm to mute.`);

        for (let i = 0; i < GuildDB.alarms.length; i++) {
          alarms.addOptions({
            label: GuildDB.alarms[i].name,
            description: `Mute the role pings of this Alarm`,
            value: GuildDB.alarms[i].name,
          })
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
          }, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
  
          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`**Success:** Successfully Deleted **${interaction.customId.split('-')[2]}**`);
  
          return interaction.update({ embeds: [successEmbed], components: [] });
        } else {
          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`The Zone Alarm **${interaction.customId.split('-')[2]}** will not be deleted.`);
  
          return interaction.update({ embeds: [successEmbed], components: []});
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
      
        let playerStat = await client.dbo.collection("players").findOne({"gamertag": interaction.customId.split('-')[2]});
        if (!client.exists(playerStat)) return interaction.update({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before.')], components: [] });
      
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
        }, (err, res) => {
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
          }, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });

          let successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`**Success:** Successfully Added Rule **${interaction.customId.split('-')[2]}** to **${alarm.name}**`);

          return interaction.update({ embeds: [successEmbed], components: [] });

        } else if (interaction.customId.split('-')[1]=='remove') {

          let alarmRules = new StringSelectMenuBuilder()
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
        }, (err, res) => {
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
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully ${disable ? 'disabled' : 'enabled'} the Alarm **${interaction.values[0]}**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    MoveOrigin: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
        let origin = [parseFloat(interaction.customId.split('-')[1]), parseFloat(interaction.customId.split('-')[2])];
        alarm.origin = origin;
        GuildDB.alarms[alarmIndex] = alarm

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully moved alarm to new **[origin](https://www.izurvive.com/chernarusplussatmap/#location=${origin[0]};${origin[1]})**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    RenameAlarm: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
        let oldName = alarm.name;
        alarm.name = interaction.customId.split('-')[1];
        GuildDB.alarms[alarmIndex] = alarm

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully renamed the Alarm **${oldName}** to **${alarm.name}**`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    MuteAlarm: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This menu is not for you",
            flags: (1 << 6)
          })
        }

        let alarm = GuildDB.alarms.find(alarm => alarm.name == interaction.values[0]);
        let alarmIndex = GuildDB.alarms.indexOf(alarm);
        let mute = parseInt(interaction.customId.split('-')[1]);
        alarm.mute = mute;
        GuildDB.alarms[alarmIndex] = alarm

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.alarms': GuildDB.alarms,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully ${mute?'Muted':'Unmuted'} this alarm.`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    }
  } 
}
