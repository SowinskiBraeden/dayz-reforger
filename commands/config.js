const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const bitfieldCalculator = require('discord-bitfield-calculator');
const { getDefaultSettings } = require('../database/guild');

module.exports = {
  name: "config",
  debug: false,
  global: false,
  description: "Configure your server settings",
  usage: "[options] [configuration]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },  
  options: [
    {
      name: "killfeed",
      description: "Configure the killfeed",
      value: "killfeed",
      type: CommandOptions.SubCommandGroup,
      options: [
        {
          name: "channel",
          description: "Configure the killfeed channel",
          value: "channel",
          type: CommandOptions.SubCommand,
          options: [{
            name: "channel",
            description: "The channel to configure",
            value: "channel",
            type: CommandOptions.Channel,
            required: true
          }]
        },
        {
          name: "show_coords",
          description: "Show the coordinates of the victim in the killfeed channel.",
          value: "show_coords",
          type: CommandOptions.SubCommand,
          options: [{
            name: "configuration",
            description: "True or False",
            value: false,
            type: CommandOptions.Boolean,
            required: true,
          }]
        },
        {
          name: "show_weapon",
          description: "Show the image of the weapon in the killfeed",
          value: "show_weapon",
          type: CommandOptions.SubCommand,
          options: [{
            name: "configuration",
            description: "True or False",
            value: false,
            type: CommandOptions.Boolean,
            required: true,
          }]
        }
      ]
    },
    {
      name: "allowed_channels",
      description: "Set channels you're allowed to use the bot in",
      value: "allowed_channels",
      type: CommandOptions.SubCommandGroup,
      options: [
        {
          name: "add",
          description: "Add channel",
          value: "add",
          type: CommandOptions.SubCommand,
          options: [{
            name: "channel",
            description: "The channel to configure",
            value: "channel",
            type: CommandOptions.Channel,
            channel_types: [0], // Restrict to text channel
            required: true,
          }]
        },
        {
          name: "remove",
          description: "Remove channel",
          value: "remove",
          type: CommandOptions.SubCommand,
          options: [{
            name: "channel",
            description: "The channel to configure",
            value: "channel",
            type: CommandOptions.Channel,
            channel_types: [0], // Restrict to text channel
            required: true,
          }]
        },
        {
          name: "clear",
          description: "Clears all configured channels",
          value: "clear",
          type: CommandOptions.SubCommand,   
        },
        {
          name: "view",
          description: "View configured allowed channels",
          value: "view",
          type: CommandOptions.SubCommand,
        }
      ]
    },
    {
      name: "set_channel",
      description: "Configure a channel",
      value: "set_channel",
      type: CommandOptions.SubCommand,
      options:[
        {
          name: "channel_type",
          description: "Select the channel type",
          value: "channel_type",
          type: CommandOptions.String,
          choices: [
            { name: 'Killfeed', value: 'killfeedChannel' }, { name: 'Admin Logs', value: 'connectionLogsChannel' },
            { name: 'Welcome', value: 'welcomeChannel' }, { name: 'Online Players', value: 'activePlayersChannel' },
          ],
          required: true,
        },
        {
          name: "channel",
          description: "The channel to configure",
          value: "channel",
          type: CommandOptions.Channel,
          channel_types: [0], // Restrict to text channel
          required: true,
        },
      ]
    },
    {
      name: "linked_gt_role",
      description: "Role for users with linked gamertags",
      value: "linked_gt_role",
      type: CommandOptions.SubCommand,
      options: [{
        name: "role",
        description: "Role to configure",
        value: "role",
        type: CommandOptions.Role,
        required: true,
      }]
    },
    {
      name: "member_role",
      description: "Role for users who join the server",
      value: "member_role",
      type: CommandOptions.SubCommand,
      options: [{
        name: "role",
        description: "Role to configure",
        value: "role",
        type: CommandOptions.Role,
        required: true,
      }]
    },
    {
      name: "bot_admin_role",
      description: "Set/remove bot admin role",
      value: "bot_admin_role",
      type: CommandOptions.SubCommandGroup,
      options: [
        {
          name: "add",
          description: "Configure role to be bot admin",
          value: "add",
          type: CommandOptions.SubCommand,
          options: [{
            name: "role",
            description: "Role to confiure",
            value: "role",
            type: CommandOptions.Role,
            required: true,
          }]
        },
        {
          name: "remove",
          description: "Remove configured role as bot admin",
          value: "remove",
          type: CommandOptions.SubCommand,
          options: [{
            name: "role",
            description: "Role to remove",
            value: "role",
            type: CommandOptions.Role,
            required: true,
          }]
        },
        {
          name: "view",
          description: "View the configured bot admin roles",
          value: "view",
          type: CommandOptions.SubCommand,
        }
      ]
    },
    {
      name: "admin_ping_role",
      description: "Admin role to ping in admin logs channel",
      value: "admin_ping_role",
      type: CommandOptions.SubCommand,
      options: [{
        name: "role",
        description: "Role to configure",
        value: "role",
        type: CommandOptions.Role,
        required: true,
      }]
    },
    {
      name: "exclude",
      description: "Exclude roles that users can use to claim an armband",
      value: "exclude",
      type: CommandOptions.SubCommand,
      options: [
        {
          name: "action",
          description: "Add or remove a role from the exclude list.",
          value: "action",
          type: CommandOptions.String,
          choices: [
            { name: 'add', value: 'add' }, { name: 'remove', value: 'remove' },
          ],
          required: true,
        },
        {
          name: "role",
          description: "The role to manage",
          value: "role",
          type: CommandOptions.Role,
          required: true,
        },
      ]
    },
    {
      name: "reset",
      description: "Restore all settings to default configurations",
      value: "reset",
      type: CommandOptions.SubCommand,
    },
    {
      name: "view",
      description: "View current settings configuration",
      value: "view",
      type: CommandOptions.SubCommand,
    },
    {
      name: "starting_balance",
      description: "Set the starting balance of a new user",
      value: "starting_balance",
      type: CommandOptions.SubCommand,
      options: [{
        name: "amount",
        description: "The amount to set the starting balance",
        value: "amount",
        type: CommandOptions.Float,
        min_value: 1.00,
        required: true,
      }]
    },
    {
      name: "uav-price",
      description: "Configure the price of a UAV",
      value: "uav-price",
      type: CommandOptions.SubCommand,
      options: [{
        name: "amount",
        description: "The amount to set the UAV price",
        value: "amount",
        type: CommandOptions.Float,
        min_value: 0.01,
        required: true,
      }]
    },
    {
      name: "emp-price",
      description: "Configure the price of an EMP",
      value: "emp-price",
      type: CommandOptions.SubCommand,
      options: [{
        name: "amount",
        description: "The amount to set the EMP price",
        value: "amount",
        type: CommandOptions.Float,
        min_value: 0.01,
        required: true,
      }]
    },
    {
      name: "income_role",
      description: "Set/remove roles to recieve income",
      value: "set_income_role",
      type: CommandOptions.SubCommandGroup,
      options: [
        {
          name: "set",
          description: "Set role",
          value: "set",
          type: CommandOptions.SubCommand,
          options: [
            {
              name: "role",
              description: "Role to set",
              value: "role",
              type: CommandOptions.Role,
              required: true,
            },
            {
              name: "amount",
              description: "The amount to collect",
              value: 120.00,
              type: CommandOptions.Float,
              min_value: 0.01,
              required: true,
            }
          ]
        },
        {
          name: "remove",
          description: "Remove role",
          value: "remove",
          type: CommandOptions.SubCommand,
          options: [{
            name: "role",
            description: "Role to remove",
            value: "role",
            type: CommandOptions.Role,
            required: true,
          }]
        },
      ],
    },
    {
      name: "income_limiter",
      description: "Change the number of hours to wait before collecting next income",
      value: "income_limiter",
      type: CommandOptions.SubCommand,
      options: [{
        name: "hours",
        description: "Number of hours till income can be collected",
        value: 168.00, // 1 week
        type: CommandOptions.Float,
        min_value: 1.00,
        required: true,
      }]
    },
    {
      name: "combat-log-timer",
      description: "Adjust number of minutes to detect combat logs (0 disables combat log)",
      value: "combat-log-timer",
      type: CommandOptions.SubCommand,
      options: [{
        name: "minutes",
        description: "Minutes to qualify combat log",
        value: 5,
        type: CommandOptions.Integer,
        min_value: 0,
      }]
    },
    {
      name: "toggle-uav-purchase",
      description: "Allow/Disallow UAV purchases",
      value: "toggle-uav-purchase",
      type: CommandOptions.SubCommand,
      options: [{
        name: "configuration",
        description: "True or False",
        value: false,
        type: CommandOptions.Boolean,
        required: true,
      }]
    },
    {
      name: "toggle-emp-purchase",
      description: "Allow/Disallow EMP purchases",
      value: "toggle-uav-purchase",
      type: CommandOptions.SubCommand,
      options: [{
        name: "configuration",
        description: "True or False",
        value: false,
        type: CommandOptions.Boolean,
        required: true,
      }]
    },
    {
      name: "welcome_message_server_name",
      description: "Configure the server name in the welcome message",
      value: "welcome_message_server_name",
      type: CommandOptions.SubCommand,
      options: [{
        name: "name",
        description: "Server name to include in welcome message",
        value: "name",
        type: CommandOptions.String,
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

      switch(args[0].name) {

        case 'allowed_channels':
          const channels_config = args[0].options[0].name;
          const channelid = ['add', 'remove'].includes(channels_config) ? args[0].options[0].options[0].value : null;

          if (channels_config == 'add') {
            const channelAdd = client.GetChannel(channelid);

            const newChannelErrorEmbed = new EmbedBuilder().setColor(client.config.Colors.Red)
            let error = false;

            if (!channelAdd) {error=true;newChannelErrorEmbed.setDescription(`**Error Notice:** Cannot find that channel.`);}
            if (channelAdd.type=="voice") {error=true;newChannelErrorEmbed.setDescription(`**Error Notice:** Cannot add voice channel to allowed channels.`);}
            if (error) return interaction.send({ embeds: [newChannelErrorEmbed] });
                      
            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$push:{"server.allowedChannels": channelid}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successAddChannelEmbed = new EmbedBuilder()
              .setColor(client.config.Colors.Green)
              .setDescription(`**Success:** Set <#${channelid}> as an allowed channel.`);

            return interaction.send({ embeds: [successAddChannelEmbed] });
          } else if (channels_config == 'remove') {

            const errorChannelNotAvailable = new EmbedBuilder()
              .setDescription(`**Error Notice:** <#${channelid}> is not in allowed channels.`)
              .setColor(client.config.Colors.Red)

            if (!GuildDB.allowedChannels.includes(channelid)) return interaction.send({ embeds: [errorChannelNotAvailable] });

            const promptRemoveChannel = new EmbedBuilder()
              .setTitle(`Are you sure you want to remove this channel from allowed channels?`)
              .setColor(client.config.Colors.Default)

            const optRemoveChannel = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`RemoveAllowedChannels-yes-${channelid}-${interaction.member.user.id}`)
                  .setLabel("Yes")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`RemoveAllowedChannels-no-${channelid}-${interaction.member.user.id}`)
                  .setLabel("No")
                  .setStyle(ButtonStyle.Success)
              )

            return interaction.send({ embeds: [promptRemoveChannel], components: [optRemoveChannel], flags: (1 << 6) });
            
          } else if (channels_config == 'clear') {

            const errorNoAllowedChannels = new EmbedBuilder()
              .setDescription(`**Error Notice:**\n> No allowed channels configured to clear`)
              .setColor(client.config.Colors.Red)

            if (GuildDB.allowedChannels.length == 0) return interaction.send({ embeds: [errorNoAllowedChannels] });

            const promptClearChannels = new EmbedBuilder()
              .setTitle(`Are you sure you want to clear all configured channels from allowed channels?`)
              .setColor(client.config.Colors.Default)

            const optClearChannels = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`ClearAllowedChannels-yes-${interaction.member.user.id}`)
                  .setLabel("Yes")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`ClearAllowedChannels-no-${interaction.member.user.id}`)
                  .setLabel("No")
                  .setStyle(ButtonStyle.Success)
              )

            return interaction.send({ embeds: [promptClearChannels], components: [optClearChannels], flags: (1 << 6) });
            

          } else if (channels_config == 'view') {
            
            if (!GuildDB.customChannelStatus) {
              const noConfiguredChannels = new EmbedBuilder()
                .setColor(client.config.Colors.Default)
                .setTitle('Channels')
                .setDescription('> There are no configured channels');

              return interaction.send({ embeds: [noConfiguredChannels] });
            }

            const configuredChannels = new EmbedBuilder()
              .setColor(client.config.Colors.Default)
              .setTitle('Channels')

            let des = '';
            for (let i = 0; i < GuildDB.allowedChannels.length; i++) {
              if (i == 0) des += `> <#${GuildDB.allowedChannels[i]}>`;
              else des += `\n> <#${GuildDB.allowedChannels[i]}>`;
            }
            configuredChannels.setDescription(des);

            return interaction.send({ embeds: [configuredChannels] });
          
          }

        case 'bot_admin_role':
          const bot_admin_config = args[0].options[0].name;
          const botAdminRoleId = ['add', 'remove'].includes(bot_admin_config) ? args[0].options[0].options[0].value : null;
          if (bot_admin_config == 'add') {

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$push: {"server.botAdminRoles": botAdminRoleId}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });
      
            const successSetBotAdminRoleEmbed = new EmbedBuilder()
              .setDescription(`Successfully added <@&${botAdminRoleId}> as a bot admin role.\nUsers with this role can use restricted commands.`)
              .setColor(client.config.Colors.Green);
      
            return interaction.send({ embeds: [successSetBotAdminRoleEmbed] });    

          } else if (bot_admin_config == 'remove') {

            if (!GuildDB.botAdminRoles.includes(botAdminRoleId)) {
              const nonAdminRoleEmbed = new EmbedBuilder()
                .setColor(client.config.Colors.Yellow)
                .setDescription(`**Notice:**\n> The role <@&${botAdminRoleId}> has not been configured as a bot admin.`);

              return interaction.send({ embeds: [nonAdminRoleEmbed] });
            }

            const promptRemoveAdminRole = new EmbedBuilder()
              .setTitle(`Are you sure you want to remove this role as a bot admin?`)
              .setColor(client.config.Colors.Default)

            const optRemoveAdminRole = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`RemoveBotAdminRole-yes-${botAdminRoleId}-${interaction.member.user.id}`)
                  .setLabel("Yes")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`RemoveBotAdminRole-no-${botAdminRoleId}-${interaction.member.user.id}`)
                  .setLabel("No")
                  .setStyle(ButtonStyle.Success)
              )

            return interaction.send({ embeds: [promptRemoveAdminRole], components: [optRemoveAdminRole], flags: (1 << 6) });
          
          } else if (bot_admin_config == 'view') {

            if (GuildDB.botAdminRoles.length == 0) {
              const noBotAdminRoles = new EmbedBuilder()
                .setColor(client.config.Colors.Default)
                .setTitle('Admin Roles')
                .setDescription('> There have been no configured admin roles');

              return interaction.send({ embeds: [noBotAdminRoles] });
            }

            const botAdminRolesEmbed = new EmbedBuilder()
              .setColor(client.config.Colors.Default)
              .setTitle('Admin Roles')

            let des = '';
            for (let i = 0; i < GuildDB.botAdminRoles.length; i++) {
              des += `\n> <@&${GuildDB.botAdminRoles[i]}>`;
            }
            botAdminRolesEmbed.setDescription(des);

            return interaction.send({ embeds: [botAdminRolesEmbed] });

          }

        case 'admin_ping_role':
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.adminRole": args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          const successSetAdminRoleEmbed = new EmbedBuilder()
            .setDescription(`Successfully set <@&${args[0].options[0].value}> as the server admin role..`)
            .setColor(client.config.Colors.Green);
    
          return interaction.send({ embeds: [successSetAdminRoleEmbed] });

        case 'exclude':
          if (args[0].options[0].value == 'add') {
            client.dbo.collection('guilds').updateOne({'server.serverID': GuildDB.serverID}, {$push: {'server.excludedRoles': args[0].options[1].value}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            })

            const successExcludeEmbed = new EmbedBuilder()
              .setColor(client.config.Colors.Green)
              .setDescription(`**Done!**\n> Successfully added <@&${args[0].options[1].value}> to list of excluded roles.`)

            return interaction.send({ embeds: [successExcludeEmbed] });

          } else if (args[0].options[0].value == 'remove') {
            client.dbo.collection('guilds').updateOne({'server.serverID': GuildDB.serverID}, {$pull: {'server.excludedRoles': args[0].options[1].value}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            })

            const successRemoveExcludeEmbed = new EmbedBuilder()
              .setColor(client.config.Colors.Green)
              .setDescription(`**Done!**\n> Successfully removed <@&${args[0].options[1].value}> to list of excluded roles.`)

            return interaction.send({ embeds: [successRemoveExcludeEmbed] });
          }

        case 'reset':
          const promptReset = new EmbedBuilder()
            .setTitle(`Woah!? Hold on.`)
            .setDescription('Are you sure you wish to remove all your configurations for this guild?')
            .setColor(client.config.Colors.Default)

          const optReset = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`ResetSettings-yes-${interaction.member.user.id}`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`ResetSettings-no-${interaction.member.user.id}`)
                .setLabel("No")
                .setStyle(ButtonStyle.Success)
            )

          return interaction.send({ embeds: [promptReset], components: [optReset], flags: (1 << 6) });
      
        case 'view':

          // wrappers
          const w = "\`\`\`";
          const a = "ansi\n";
          const f = "fix\n";
          const m = "arm\n"
          const g = "[2;32m";
          const r = "[2;31m";

          // boolean display
          const autoRestart             = GuildDB.autoRestart        ? `${g}true` : `${r}false`;
          const showKillfeedCoords      = GuildDB.showKillfeedCoords ? `${g}true` : `${r}false`;
          const showKillfeedWeapon      = GuildDB.showKillfeedWeapon ? `${g}true` : `${r}false`;
          const purchaseUAV             = GuildDB.purchaseUAV        ? `${g}true` : `${r}false`;
          const purchaseEMP             = GuildDB.purchaseEMP        ? `${g}true` : `${r}false`;
          const adminRoles              = GuildDB.hasBotAdmin        ? `${g}true` : `${r}false`
          const excludedRoles           = GuildDB.hasExcludedRoles   ? `${g}true` : `${r}false`; 

          // Role / channel display
          const NONE                    = `${w}${m}none${w}`;
          const channelsInfo            = GuildDB.customChannelStatus                  ? '\`</channels:1225869620813107246>\` to view' : NONE;
          const killfeedChannel         = client.exists(GuildDB.killfeedChannel)       ? `<#${GuildDB.killfeedChannel}>`               : NONE;
          const connectionLogs          = client.exists(GuildDB.connectionLogsChannel) ? `<#${GuildDB.connectionLogsChannel}>`         : NONE;
          const activePlayers           = client.exists(GuildDB.activePlayersChannel)  ? `<#${GuildDB.activePlayersChannel}>`          : NONE;
          const welcomeChannel          = client.exists(GuildDB.welcomeChannel)        ? `<#${GuildDB.welcomeChannel}>`                : NONE;
          const linkedGTRole            = client.exists(GuildDB.linkedGamertagRole)    ? `<@&${GuildDB.linkedGamertagRole}>`           : NONE;
          const memberRole              = client.exists(GuildDB.memberRole)            ? `<@&${GuildDB.memberRole}>`                   : NONE;

          // value display
          const incomeLimiter           = `${GuildDB.incomeLimiter} hours`;
          const startingBalance         = `$${GuildDB.startingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          const uavPrice                = `$${GuildDB.uavPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          const empPrice                = `$${GuildDB.empPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          const combatLogTimer          = `${GuildDB.combatLogTimer} minutes`;

          // Ugly below but kinda nice above
          const settingsEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setTitle('Current Guild Configurations')
            .addFields(
              { name: 'Guild ID',                value: `${w}${f}${GuildDB.serverID}${w}`,   inline: true },
              { name: 'Server Name',             value: `${w}${f}${GuildDB.serverName}${w}`, inline: true },
              { name: 'Auto Restart',            value: `${w}${a}${autoRestart}${w}`,        inline: true },
              { name: 'UAVs Enabled',            value: `${w}${a}${purchaseUAV}${w}`,        inline: true },
              { name: 'EMPs Enabled',            value: `${w}${a}${purchaseEMP}${w}`,        inline: true },
              { name: 'Show Killfeed Coords',    value: `${w}${a}${showKillfeedCoords}${w}`, inline: true },
              { name: 'Show Killfeed Weapons',   value: `${w}${a}${showKillfeedWeapon}${w}`, inline: true },
              { name: 'Has Admin Rols',          value: `${w}${a}${adminRoles}${w}`,         inline: true },
              { name: 'Has Excluded Roles',      value: `${w}${a}${excludedRoles}${w}`,      inline: true },
              { name: 'Allowed Channels',        value: `${channelsInfo}`,                   inline: true },
              { name: 'Killfeed Channel',        value: `${killfeedChannel}`,                inline: true },
              { name: 'Connection Logs Channel', value: `${connectionLogs}`,                 inline: true },
              { name: 'Player List Channel',     value: `${activePlayers}`,                  inline: true },
              { name: 'Welcome Channel',         value: `${welcomeChannel}`,                 inline: true },
              { name: 'Linked Gamertag Role',    value: `${linkedGTRole}`,                   inline: true },
              { name: 'Member Role',             value: `${memberRole}`,                     inline: true },
              { name: 'Income Limiter',          value: `${w}${f}${incomeLimiter}${w}`,      inline: true },
              { name: 'Starting Balance',        value: `${w}${f}${startingBalance}${w}`,    inline: true },
              { name: 'UAV Price',               value: `${w}${f}${uavPrice}${w}`,           inline: true },
              { name: 'EMP Price',               value: `${w}${f}${empPrice}${w}`,           inline: true },
              { name: 'Combat Log Timer',        value: `${w}${f}${combatLogTimer}${w}`,     inline: true },
            );

          return interaction.send({ embeds: [settingsEmbed] });

        case 'set_channel':
          const channelType = args[0].options[0].value;
          const channel = args[0].options[1].value;

          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {[`server.${channelType}`]: channel}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          const successSetChannelEmbed = new EmbedBuilder()
            .setDescription(`Successfully set <#${channel}> as the ${channelType} channel.`)
            .setColor(client.config.Colors.Green);
    
          return interaction.send({ embeds: [successSetChannelEmbed] });
      
        case 'linked_gt_role':
          const linked_gt_role = args[0].options[0].value;
  
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.linkedGamertagRole": linked_gt_role}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          const successLinkedGTRoleEmbed = new EmbedBuilder()
            .setDescription(`Successfully set <@&${linked_gt_role}> to give to users who link their gamertag.`)
            .setColor(client.config.Colors.Green);
    
          return interaction.send({ embeds: [successLinkedGTRoleEmbed] });

        case 'member_role':
          const member_role = args[0].options[0].value;
  
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.memberRole": member_role}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          const successMemberRoleEmbed = new EmbedBuilder()
            .setDescription(`Successfully set <@&${member_role}> to give to users who link they join.`)
            .setColor(client.config.Colors.Green);
    
          return interaction.send({ embeds: [successMemberRoleEmbed] });
      
        case 'starting_balance':
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.startingBalance":args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successSetStartingBalanceEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Successfully set $${args[0].options[0].value.toFixed(2)} as starting balance`);
          
          return interaction.send({ embeds: [successSetStartingBalanceEmbed] });  
      
        case 'income_role':
          if (args[0].options[0].name== 'set') {
            const incomeRoleId = args[0].options[0].options[0].value

            if (args[0].options[0].options[1].value <= 0) {
              let errorIncomeAmount = new EmbedBuilder()
                .setDescription('**Error Notice:** Amount cannot be $0 or less than $0.')
                .setColor(client.config.Colors.Red);
      
              return interaction.send({ embeds: [errorIncomeAmount] });
            }
      
            const searchIndex = GuildDB.incomeRoles.findIndex((role) => role.role==incomeRoleId);
            if (searchIndex == -1) {
              const newIncome = {
                role: incomeRoleId,
                income: args[0].options[0].options[1].value,
              }
      
              client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$push: {"server.incomeRoles":newIncome}}, (err, res) => {
                if (err) return client.sendInternalError(interaction, err);
              });
            } else {
              client.dbo.collection("guilds").updateOne({
                "server.serverID": GuildDB.serverID,
                "server.incomeRoles.role": incomeRoleId
              },
              {
                $set: {
                  "server.incomeRoles.$.income": args[0].options[0].options[1].value
                }
              }, (err, res) => {
                if (err) return client.sendInternalError(interaction, err);
              });
            }
            const perform = searchIndex == -1 ? 'set' : 'updated';
      
            const successIncomeRoleEmbed = new EmbedBuilder()
              .setDescription(`Successfully ${perform} <@&${incomeRoleId}>'s income to $${args[0].options[0].options[1].value}`)
              .setColor(client.config.Colors.Green);
      
            return interaction.send({ embeds: [successIncomeRoleEmbed] });    

          } else if (args[0].options[0].name== 'remove') {
            const searchIndex = GuildDB.incomeRoles.findIndex((role) => role.role==incomeRoleId);
            if (searchIndex == -1) {
              const errorIncomeNotFoundEmbed = new EmbedBuilder()
                .setDescription('**Error Notice:** Role not found')
                .setColor(client.config.Colors.Red);

              return interaction.send({ embeds: [errorIncomeNotFoundEmbed] }); 
            } else {
              const promptRemoveIncomeRole = new EmbedBuilder()
                .setTitle(`Are you sure you want to remove this role as an income?`)
                .setColor(client.config.Colors.Default)

              const optRemoveIncomeRole = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(`RemoveIncomeRole-yes-${incomeRoleId}-${interaction.member.user.id}`)
                    .setLabel("Yes")
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId(`RemoveIncomeRole-no-${incomeRoleId}-${interaction.member.user.id}`)
                    .setLabel("No")
                    .setStyle(ButtonStyle.Success)
                )

              return interaction.send({ embeds: [promptRemoveIncomeRole], components: [optRemoveIncomeRole], flags: (1 << 6) });
            }
          }
      
        case 'income_limiter':
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.incomeLimiter":args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successIncomeLimiterEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Successfully set **${args[0].options[0].value} hours** as the wait time to collect income.`);
          
          return interaction.send({ embeds: [successIncomeLimiterEmbed] });          
      
        case 'uav-price':
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.uavPrice":args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successUAVPriceEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Successfully set $${args[0].options[0].value.toFixed(2)} as UAV price`);
          
          return interaction.send({ embeds: [successUAVPriceEmbed] });

        case 'emp-price':
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.empPrice":args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successEMPPriceEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Successfully set $${args[0].options[0].value.toFixed(2)} as EMP price`);
          
          return interaction.send({ embeds: [successEMPPriceEmbed] });          

        case 'combat-log-timer':
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.combatLogTimer":args[0].options[0].value}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successCobatLogTimerEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Successfully set combat log timer to **${args[0].options[0].value.toFixed(0)} minutes.**`);

          return interaction.send({ embeds: [successCobatLogTimerEmbed] });

        case 'toggle-uav-purchase':
          const togggleUAVpurchase = args[0].options[0].value ? 1 : 0;  

          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.purchaseUAV": togggleUAVpurchase}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successToggleUAVpurchaseEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Users can ${togggleUAVpurchase ? 'now' : 'no longer'} purchase UAVs.`);

          return interaction.send({ embeds: [successToggleUAVpurchaseEmbed] });

        case 'toggle-emp-purchase':
          const togggleEMPpurchase = args[0].options[0].value ? 1 : 0;  

          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: {"server.purchaseEMP": togggleEMPpurchase}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
    
          let successToggleEMPpurchaseEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setDescription(`Users can ${togggleUAVpurchase ? 'now' : 'no longer'} purchase EMPs.`);

          return interaction.send({ embeds: [successToggleEMPpurchaseEmbed] });

        case 'killfeed':
          const killfeed_configuration = args[0].options[0].name;

          if (killfeed_configuration == 'channel') {

            const channel = args[0].options[0].options[0].value;

            client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID},{$set: {'server.killfeedChannel': channel}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successConfigureKillfeedChannel = new EmbedBuilder()
              .setColor(client.config.Colors.Green)
              .setDescription(`Successfully configured the killfeed channel to <#${channel}>`);

            return interaction.send({ embeds: [successConfigureKillfeedChannel] });

          } else if (killfeed_configuration == 'show_coords') {
            const showKillfeedCoordsConfiguration = args[0].options[0].options[0].value ? 1 : 0;

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.showKillfeedCoords": showKillfeedCoordsConfiguration}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successConfigureShowKillfeedCoords = new EmbedBuilder()
              .setDescription(`Successfully configured the killfeed to ${showKillfeedCoordsConfiguration ? 'show' : 'not show'} coordinates.`)
              .setColor(client.config.Colors.Green);

            return interaction.send({ embeds: [successConfigureShowKillfeedCoords] });

          } else if (killfeed_configuration == 'show_weapon') {

            const showKillfeedWeaponConfiguration = args[0].options[0].options[0].value ? 1 : 0;

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.showKillfeedWeapon": showKillfeedWeaponConfiguration}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successConfigureShowKillfeedCoords = new EmbedBuilder()
              .setDescription(`Successfully configured the killfeed to ${showKillfeedWeaponConfiguration ? 'show' : 'not show'} weapon icons.`)
              .setColor(client.config.Colors.Green);

            return interaction.send({ embeds: [successConfigureShowKillfeedCoords] });

          }

        case 'welcome_message_server_name':
          const server_name = args[0].options[0].value;

          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.serverName":server_name}}, (err, res) => {
            if (err) return client.sendInternalError(interacion, err);
          });

          const succcessUpdateServerName = new EmbedBuilder()
            .setDescription(`Successfully configured the server name to **${server_name}** in the welcome message.`)
            .setColor(client.config.Colors.Green);

          return interaction.send({ embeds: [succcessUpdateServerName] });

        default:
          return client.sendInternalError(interaction, 'There was an error parsing the config command');
      }
    },
  },

  Interactions: {
    
    RemoveAllowedChannels: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        let action = ''
        if (interaction.customId.split('-')[1]=='yes') {
          action = 'removed';
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$pull:{"server.allowedChannels": interaction.customId.split('-')[2]}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else if (interaction.customId.split('-')[1]=='no') action = 'kept';
    
        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setTitle(`**Success**\n> Successfullly ${action} the channel.`)
    
        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    ClearAllowedChannels: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This buttpm is not for you",
            flags: (1 << 6) 
          });
        }
        let action;
        if (interaction.customId.split('-')[1] == 'yes') {
          action = 'cleared'; 
          client.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set:{"server.allowedChannels":[]}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          })
        } else if (interaction.customId.split('-')[1] == 'no') action = 'kept';

        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setTitle(`**Success**\n> Successfully ${action} all configured channels.`);

        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    RemoveBotAdminRole: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return ButtonInteraction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        let action = '';
        let roleId = interaction.customId.split('-')[2];
        if (interaction.customId.split('-')[1]=='yes') {
          action = 'removed';
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$pull: {"server.botAdminRoles": roleId}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else if (interaction.customId.split('-')[1]=='no') action = 'kept';
    
        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Successfully ${action} <@&${roleId}> as the bot admin role.**`)
    
        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    RemoveIncomeRole: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return ButtonInteraction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        let action = '';
        let roleId = interaction.customId.split('-')[2];
        if (interaction.customId.split('-')[1]=='yes') {
          action = 'removed';
          let income = GuildDB.incemeRoles.find((i) => i.role == roleId);
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$pull: {"server.incomeRoles": income}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else if (interaction.customId.split('-')[1]=='no') action = 'kept';
    
        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Successfully ${action} <@&${roleId}> as an income role.**`)
    
        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    },

    ResetSettings: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return ButtonInteraction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        let action = '';
        if (interaction.customId.split('-')[1]=='yes') {
          action = 'reset';
          const defaultGuildConfig = getDefaultSettings(GuildDB.serverID);
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$set: {"server": defaultGuildConfig}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else if (interaction.customId.split('-')[1]=='no') action = 'kept';
    
        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setTitle(`Successfully ${action} guild configurations.`)
    
        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    }
  } 
}