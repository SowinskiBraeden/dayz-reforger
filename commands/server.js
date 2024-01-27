const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const bitfieldCalculator = require('discord-bitfield-calculator');
const { BanPlayer, UnbanPlayer, RestartServer, CheckServerStatus, DisableBaseDamage, DisableContainerDamage } = require('../util/NitradoAPI');

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
  options: [
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

      if (args[0].name == 'ban-player') {

        let data = await BanPlayer(client, args[0].options[0].value);

        if (data == 1) {
          let failed = new EmbedBuilder()
            .setColor(client.config.Colors.Red)
            .setDescription(`Failed to ban **${args[0].options[0].value}**. Check internal logs for an error.`);

          return interaciton.send({ embeds: [failed] });
        }

        let banned = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully **banned** **${args[0].options[0].value}** from the DayZ Server`);

        return interaction.send({ embeds: [banned] });

      } else if (args[0].name == 'unban-player') {

        let data = UnbanPlayer(client, args[0].options[0].value);

        if (data == 1) {
          let failed = new EmbedBuilder()
            .setColor(client.config.Colors.Red)
            .setDescription(`Failed to ban **${args[0].options[0].value}**. Check internal logs for an error.`);

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

        RestartServer(client, restart_message, message);
        return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('The server will restart shortly.')], flags: (1 << 6) });

      } else if (args[0].name == "auto-restart") {
        msg = 'Auto server restart periodic check enabled.';
        pref = 0;

        // Enable/Disable a 10min periodic server status check.
        if (!client.arIntervalId) {
          client.arIntervalId = setInterval(CheckServerStatus, client.arInterval, client);
          client.log('Enabled and starting periodic Nitrado server status check.');
          pref = 1;
        } else {
          msg = 'Auto server restart periodic check disabled.'
          clearInterval(client.arIntervalId);
          client.arIntervalId = 0;
          client.log('Disabled periodic Nitrado server status check.');
        }

        // Update DB preference
        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            "server.autoRestart": pref
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(msg)], flags: (1 << 6) });
      
      } else if (args[0].name == 'disable-base-damage') {
        const preference = args[0].options[0].value;
        await interaction.deferReply({ flags: (1 << 6) });

        const disableBaseDamageFailed = await DisableBaseDamage(client, preference);

        if (disableBaseDamageFailed) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('Failed to set **disableBaseDamage**, try again later.')], flags: (1 << 6) });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Green).setDescription(`Successfully set **disableBaseDamage** to ${preference}.\nRestart the DayZ server to apply these changes.`)], flags: (1 << 6) });
      
      } else if (args[0].name == 'disable-container-damage') {
        const preference = args[0].options[0].value;
        await interaction.deferReply({ flags: (1 << 6) });

        const disableContainerDamageFailed = await DisableContainerDamage(client, preference);

        if (disableContainerDamageFailed) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Red).setDescription('Failed to set **disableContainerDamage**, try again later.')], flags: (1 << 6) });
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Green).setDescription(`Successfully set **disableContainerDamage** to ${preference}.\nRestart the DayZ server to apply these changes.`)], flags: (1 << 6) });
      
      }
    }
  },

  Interactions: {}
}
