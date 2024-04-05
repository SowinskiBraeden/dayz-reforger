const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "event",
  debug: false,
  global: false,
  description: "Admin controlled events",
  usage: "[event] [option]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "player-track",
    description: "Track a player and announce location",
    value: "player-track",
    type: CommandOptions.SubCommand,
    options: [{
      name: "gamertag",
      description: "Gamertag of player",
      value: "gamertag",
      type: CommandOptions.String,
      required: true,
    },
    {
      name: "time",
      description: "Duration of tracking",
      value: "time",
      type: CommandOptions.Integer,
      required: true,
      choices: [
        { name: '10-minutes', value: 10 }, { name: '15-minutes', value: 15 }, { name: '20-minutes', value: 20 }, { name: '25-minutes', value: 25 }, 
        { name: '30-minutes', value: 30 }, { name: '60-minutes', value: 60 }, { name: '90-minutes', value: 90 }, { name: '120-minutes', value: 120 },
      ]
    },
    {
      name: "event-name",
      description: "Name of the event",
      value: "event-name",
      type: CommandOptions.String,
      required: true,
    },
    {
      name: "channel",
      description: "Channel to post tracking data",
      value: "channel",
      type: CommandOptions.Channel,
      channel_types: [0], // Restrict to text channel
      required: true,
    }, {
      name: "role",
      description: "Optional role to ping",
      value: "role",
      type: CommandOptions.Role,
      required: false,
    }]
  }, {
    name: "delete",
    description: "Delete an active event",
    value: "delete",
    type: CommandOptions.SubCommand
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

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }

      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (GuildDB.hasBotAdmin && interaction.member.roles.filter(e => GuildDB.botAdminRoles.indexOf(e) !== -1).length > 0) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      let events = GuildDB.events;

      if (args[0].name == 'player-track') {

        let playerStat = await client.dbo.collection("players").findOne({"gamertag": args[0].options[0].value});
        if (!client.exists(playerStat)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].options[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

        let event = {
          type: args[0].name,
          name: args[0].options[2].value,
          gamertag: args[0].options[0].value,
          channel: args[0].options[3].value,
          role: args[0].options[4] ? args[0].options[4].value : null,
          time: args[0].options[1].value,
          creationDate: new Date(),
        };

        events.push(event);

        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            "server.events": events
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        const successCreatePlayerTrack = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Success:** Successfully created **${event.name}** that will last **${event.time} minutes.**`)

        return interaction.send({ embeds: [successCreatePlayerTrack] });

      } else if (args[0].name == 'delete') {
        if (GuildDB.events.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Events to Delete.')] });

        let events = new StringSelectMenuBuilder()
          .setCustomId(`DeleteEvent-${interaction.member.user.id}`)
          .setPlaceholder(`Select an Event to Delete.`)

        for (let i = 0; i < GuildDB.events.length; i++) {
          events.addOptions({
            label: GuildDB.events[i].name,
            description: `Delete this Event`,
            value: GuildDB.events[i].name
          });
        }
        
        const eventsOptions = new ActionRowBuilder().addComponents(events);

        return interaction.send({ components: [eventsOptions], flags: (1 << 6) });
      }
    }
  },

  Interactions: {

    DeleteEvent: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        let event = GuildDB.events.find(e => e.name == interaction.values[0]);

        client.dbo.collection('guilds').updateOne({ 'server.serverID': GuildDB.serverID }, {
          $pull: {
            'server.events': event,
          }
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });

        let successEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`**Success:** Successfully Deleted **${event.name} Event**`);
  
        return interaction.update({ embeds: [successEmbed], components: [] });
      }
    }
  }
}