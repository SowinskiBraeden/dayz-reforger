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
      descripion: "Configure the killfeed",
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
      ]
    },
    {
      name: "set_channel",
      description: "Set one of the desired channels",
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
      description: "Access Role to give to users",
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
      description: "Role to give users when they join.",
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
          description: "Role to configure",
          value: "role",
          type: CommandOptions.Role,
          required: true,
        },
      ]
    },
    {
      name: "admin_role",
      description: "Discord Server's dedicated admin role",
      value: "admin_role",
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
      description: "Exclude roles from users to use to claim a flag.",
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
      description: "Set the starting balance",
      value: "starting_balance",
      type: CommandOptions.SubCommand,
      options: [{
        name: "amount",
        description: "The amount to set the starting balance",
        value: "amount",
        type: CommandOptions.Float,
        min_value: 0.01,
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
      description: "Add/update a role to earn income on /collect-income command",
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
      description: "Change the number of hours to wait before collecting income",
      value: "income_limiter",
      type: CommandOptions.SubCommand,
      options: [{
        name: "hours",
        description: "Number of hours till income can be collected",
        value: 168.00, // 1 week
        type: CommandOptions.Float,
        required: true,
      }]
    },
    {
      name: "combat-log-timer",
      description: "Adjust log timeout for combat prevention. (0 disables combat log)",
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
          const channelid = args[0].options[0].options[0].value;

          if (args[0].options[0].name == 'add') {
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
          } else if (args[0].options[0].name=='remove') {

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
                  .setCustomId(`RemoveAllowedChannels-yes-${interaction.member.user.id}`)
                  .setLabel("Yes")
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`RemoveAllowedChannels-no-${interaction.member.user.id}`)
                  .setLabel("No")
                  .setStyle(ButtonStyle.Success)
              )

            return interaction.send({ embeds: [promptRemoveChannel], components: [optRemoveChannel], flags: (1 << 6) });
            
          }

        case 'bot_admin_role':
          if (args[0].options[0].value == 'add') {
            const botAdminRoleId = args[0].options[1].value;

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$push: {"server.botAdminRoles": botAdminRoleId}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });
      
            const successSetBotAdminRoleEmbed = new EmbedBuilder()
              .setDescription(`Successfully added <@&${botAdminRoleId}> as a bot admin role.\nUsers with this role can use restricted commands.`)
              .setColor(client.config.Colors.Green);
      
            return interaction.send({ embeds: [successSetBotAdminRoleEmbed] });    

          } else if (args[0].options[0].value== 'remove') {

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
          }

        case 'admin_role':
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
          const channelsInfo = GuildDB.customChannelStatus ? '\n╚➤ \`/channels\` to view' : '';
          const channelColor = GuildDB.customChannelStatus ? '+ ' : '- ';
          let botAdminRoles = '';
          for (let i = 0; i < GuildDB.botAdminRoles.length; i++) {
            botAdminRoles += `\n╚➤ <@&${GuildDB.botAdminRoles[i]}>`;
          }
          const botAdminRoleColor = GuildDB.hasBotAdmin ? `+ ` : '- ';
          const excludedRolesColor = GuildDB.excludedRoles.length > 0 ? `+ ` : '- ';
          const excludedRolesInfo = GuildDB.excludedRoles.length > 0 ? '\n╚➤ \`/excluded\` to view' : '';

          const settingsEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setTitle('Current Guild Configurations')
            .addFields(
              { name: 'Guild ID', value: `\`\`\`arm\n${GuildDB.serverID}\`\`\``, inline: true },
              { name: 'Has Allowed Channels?', value: `\`\`\`diff\n${channelColor}${GuildDB.customChannelStatus}\`\`\`${channelsInfo}`, inline: true },
              { name: 'Has bot admin role?', value: `\`\`\`diff\n${botAdminRoleColor}${client.exists(GuildDB.botAdmin)}\`\`\`${botAdminRoles}`, inline: true },
              { name: 'Excluded roles?', value: `\`\`\`diff\n${excludedRolesColor}${GuildDB.excludedRoles.length > 0}\`\`\`${excludedRolesInfo}` },
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

          } else if ('show_coords') {
            const showKillfeedCoordsConfiguration = args[0].options[0].options[0].value ? 1 : 0;

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.showKillfeedCoords": showKillfeedCoordsConfiguration}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successConfigureShowKillfeedCoords = new EmbedBuilder()
              .setDescription(`Successfully configured the killfeed to ${showKillfeedCoordsConfiguration ? 'show' : 'not show'} coordinates.`)
              .setColor(client.config.Colors.Green);

            return interaction.send({ embeds: [successConfigureShowKillfeedCoords] });

          } else if ('show_weapon') {

            const showKillfeedWeaponConfiguration = args[0].options[0].options[0].value ? 1 : 0;

            client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID},{$set: {"server.showKillfeedWeapon": showKillfeedWeaponConfiguration}}, (err, res) => {
              if (err) return client.sendInternalError(interaction, err);
            });

            const successConfigureShowKillfeedCoords = new EmbedBuilder()
              .setDescription(`Successfully configured the killfeed to ${showKillfeedWeaponConfiguration ? 'show' : 'not show'} weapon icons.`)
              .setColor(client.config.Colors.Green);

            return interaction.send({ embeds: [successConfigureShowKillfeedCoords] });

          }

        default:
          return client.sendInternalError(interaction, 'There was an error parsing the config command');
      }
    },
  },

  Interactions: {
    
    RemoveAllowedChannels: {
      run: async (client, interaction, GuildDB) => {
        if (!queryString.endsWith(interaction.member.user.id)) {
          return ButtonInteraction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        let action = ''
        if (interaction.customId.split('-')[1]=='yes') {
          action = 'removed';
          client.dbo.collection("guilds").updateOne({"server.serverID":GuildDB.serverID}, {$pull:{"server.allowedChannels": channelid}}, (err, res) => {
            if (err) return client.sendInternalError(interaction, err);
          });
        } else if (interaction.customId.split('-')[1]=='no') action = 'kept';
    
        const successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setTitle(`Success: You ${action} the channel.`)
    
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