const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const bitfieldCalculator = require('discord-bitfield-calculator');
const { BanPlayer, UnbanPlayer, RestartServer, CheckServerStatus, DisableBaseDamage, DisableContainerDamage } = require('../util/NitradoAPI');
const { encrypt, decrypt } = require('../util/Cryptic');

// TODO: deactivate nitrado server from guild
module.exports = {
  name: "server",
  debug: false,
  global: false,
  description: "Nitrado DayZ Server Administrative Commands",
  usage: "[command] [options]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "initialize",
    description: "Connect your Nitrado server to the bot",
    value: "initialize",
    type: CommandOptions.SubCommand,
  },
  {
    name: "ban-player",
    description: "Ban a player from the DayZ server",
    value: "ban-player",
    type: CommandOptions.SubCommand,
    options: [{
      name: "gamertag",
      description: "gamertag of the player to ban.",
      value: "gamertag",
      type: CommandOptions.String,
      required: true,
    }]
  }, {
    name: "unban-player",
    description: "Unban a player from the DayZ server",
    value: "unban-player",
    type: CommandOptions.SubCommand,
    options: [{
      name: "gamertag",
      description: "gamertag of the player to unban.",
      value: "gamertag",
      type: CommandOptions.String,
      required: true,
    }]
  },
  {
    name: "restart",
    description: "Restart the DayZ Server",
    value: "restart",
    type: CommandOptions.SubCommand,
  }, {
    name: "auto-restart",
    description: "Enable/Disable periodic server checks and restart if stopped",
    value: "auto-restart",
    type: CommandOptions.SubCommand,
  }, {
    name: "disable-base-damage",
    description: "Disable/Enable base damage",
    value: "disable-base-damage",
    type: CommandOptions.SubCommand,
    options: [{
      name: "preference",
      description: "DisableBaseDamage Preference",
      value: true,
      type: CommandOptions.Boolean,
      required: true,
    }]
  }, {
    name: "disable-container-damage",
    description: "Disable/Enable container damage",
    value: "disable-container-damage",
    type: CommandOptions.SubCommand,
    options: [{
      name: "preference",
      description: "disableContainerDamage Preference",
      value: true,
      type: CommandOptions.Boolean,
      required: true,
    }]
  }],
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

      const NitradoCred = client.exists(GuildDB.Nitrado) ? {
        ServerID: GuildDB.Nitrado.ServerID,
        UserID: GuildDB.Nitrado.UserID,
        Auth: decrypt(
          GuildDB.Nitrado.Auth,
          client.config.EncryptionMethod,
          client.key,
          client.encryptionIV
        )
      } : {
        ServerID: null,
        UserID: null,
        Auth: null
      }

      if (args[0].name == 'initialize') {

        if (client.exists(GuildDB.Nitrado)) {
          const prompt = new EmbedBuilder()
            .setTitle(`Nitrado Server Information Already Configured!`)
            .setDescription('**Notice:** This will overwrite your previously configured Nitrado Server Information')
            .setColor(client.config.Colors.Yellow)

          const opt = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
              .setCustomId(`OverwriteNitrado-yes-${interaction.member.user.id}`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`OverwriteNitrado-no-${interaction.member.user.id}`)
                .setLabel("No")
                .setStyle(ButtonStyle.Success)
            )

          return interaction.send({ embeds: [prompt], components: [opt], flags: (1 << 6) });
        }

        const NitradoCredentials = new ModalBuilder()
          .setTitle('Connect your Nitrado Server')
          .setCustomId(`NitradoCredentials-${interaction.member.user.id}`);

        const ServerID = new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('ServerIDInput')
          .setLabel('Your Nitrado Server ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
        );

        const UserID = new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('UserIDInput')
          .setLabel('Your Nitrado User ID')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
        );

        const Auth = new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('AuthInput')
          .setLabel('Your Nitrado Authentication Token')
          .setPlaceholder("This will be encrypted to protect your server!")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
        );

        NitradoCredentials.addComponents(ServerID, UserID, Auth);

        return interaction.showModal(NitradoCredentials);

      }
      
      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription(`**Notice:**\nThis Discord guild has not been configured with a Nitrado DayZ server. To configure your guild, use </server initialize:1166877457559851011>`)] });

      if (args[0].name == 'ban-player') {

        let data = await BanPlayer(NitradoCred, client, args[0].options[0].value);

        if (data == 1) {
          let failed = new EmbedBuilder()
            .setColor(client.config.Colors.Red)
            .setDescription(`Failed to ban **${args[0].options[0].value}**. This can result from a variety of reasons:\nNitrado servers may be experiencing issues\nThe DayZ.R Bot may be experiencing issues\nYour Nitrado credentials were entered incorrectly`);

          return interaction.send({ embeds: [failed], flags: (1 << 6) });
        }

        let banned = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully **banned** **${args[0].options[0].value}** from the DayZ Server`);

        return interaction.send({ embeds: [banned] });

      } else if (args[0].name == 'unban-player') {

        let data = UnbanPlayer(NitradoCred, client, args[0].options[0].value);

        if (data == 1) {
          let failed = new EmbedBuilder()
            .setColor(client.config.Colors.Red)
            .setDescription(`Failed to unban **${args[0].options[0].value}**. This can result from a variety of reasons:\nNitrado servers may be experiencing issues\nThe DayZ.R Bot may be experiencing issues\nYour Nitrado credentials were entered incorrectly`);

          return interaction.send({ embeds: [failed] });
        }

        let banned = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully **unbanned** **${args[0].options[0].value}** from the DayZ Server`);

        return interaction.send({ embeds: [banned] });

      } else if (args[0].name == "restart") {
        // Write optional "restart_message" to set in the Nitrado server logs and send a notice "message" to your server community.
        restart_message = 'Server being restarted by an admin.';
        message = 'The server was restarted by an admin!';

        RestartServer(NitradoCred, client, restart_message, message);
        return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('The server will restart shortly.')], flags: (1 << 6) });

      } else if (args[0].name == "auto-restart") {
        let msg = 'Auto server restart periodic check enabled.';
        let pref = 0;
        
        // Enable/Disable a 10min periodic server status check.
        if (!client.arIntervalIds.has(GuildDB.serverID)) {
          client.arIntervalIds.set(GuildDB.serverID, setInterval(CheckServerStatus, client.arInterval, NitradoCred, client));
          pref = 1;
        } else {
          msg = 'Auto server restart periodic check disabled.'
          clearInterval(client.arIntervalIds.get(GuildDB.serverID));
        }

        // Update DB preference
        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            "server.autoRestart": pref,
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(msg)], flags: (1 << 6) });
      
      } else if (args[0].name == 'disable-base-damage') {
        const preference = args[0].options[0].value;
        await interaction.deferReply({ flags: (1 << 6) });

        const disableBaseDamageFailed = await DisableBaseDamage(NitradoCred, client, preference);

        if (disableBaseDamageFailed) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('Failed to set **disableBaseDamage**. This can result from a variety of reasons:\nNitrado servers may be experiencing issues\nThe DayZ.R Bot may be experiencing issues\nYour Nitrado credentials were entered incorrectly')], flags: (1 << 6) });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Green).setDescription(`Successfully set **disableBaseDamage** to ${preference}.\nRestart the DayZ server to apply these changes.`)], flags: (1 << 6) });
      
      } else if (args[0].name == 'disable-container-damage') {
        const preference = args[0].options[0].value;
        await interaction.deferReply({ flags: (1 << 6) });

        const disableContainerDamageFailed = await DisableContainerDamage(NitradoCred, client, preference);

        if (disableContainerDamageFailed) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('Failed to set **disableContainerDamage**. This can result from a variety of reasons:\nNitrado servers may be experiencing issues\nThe DayZ.R Bot may be experiencing issues\nYour Nitrado credentials were entered incorrectly')], flags: (1 << 6) });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Green).setDescription(`Successfully set **disableContainerDamage** to ${preference}.\nRestart the DayZ server to apply these changes.`)], flags: (1 << 6) });
      
      }
    }
  },

  Interactions: {
    
    NitradoCredentials: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        const Nitrado = {
          ServerID: interaction.fields.fields.get('ServerIDInput').value,
          UserID:   interaction.fields.fields.get('UserIDInput').value,
          Auth:     encrypt(
                      interaction.fields.fields.get('AuthInput').value,
                      client.config.EncryptionMethod,
                      client.key,
                      client.encryptionIV
                    ), // Encrypt the Authentication Token
        };

        await client.dbo.collection('guilds').updateOne({ "server.serverID": GuildDB.serverID }, { $set: { "Nitrado": Nitrado } }, (err, res) => {
          if (err) client.sendInternalError(interaction, err);
        });

        client.initNewNitradoServer(GuildDB.serverID, Nitrado);

        return interaction.reply({ content: 'Successfully configured your Nitrado Server Information', flags: (1 << 6) });
      }
    },

    OverwriteNitrado: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id))
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1] == 'yes') {
          const NitradoCredentials = new ModalBuilder()
            .setTitle('Connect your Nitrado Server')
            .setCustomId(`NitradoCredentials-${interaction.member.user.id}`);
  
          const ServerID = new ActionRowBuilder().addComponents(new TextInputBuilder()
            .setCustomId('ServerIDInput')
            .setLabel('Your Nitrado Server ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          );
  
          const UserID = new ActionRowBuilder().addComponents(new TextInputBuilder()
            .setCustomId('UserIDInput')
            .setLabel('Your Nitrado User ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          );
  
          const Auth = new ActionRowBuilder().addComponents(new TextInputBuilder()
            .setCustomId('AuthInput')
            .setLabel('Your Nitrado Authentication Token')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
          );
  
          NitradoCredentials.addComponents(ServerID, UserID, Auth);
  
          return interaction.update(NitradoCredentials);
        } else {
          return interaction.reply({ content: 'Cancelled Overwriting Nitrado Server Information' });
        }
      }
    }

  }
}
