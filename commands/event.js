const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "event",
  debug: false,
  global: false,
  description: "Admin controlled events",
  usage: "[event] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "player-track",
    description: "track a player and announce location",
    value: "player-track",
    type: 2,
    options: [{
      name: "gamertag",
      description: "Gamertag of player",
      value: "gamertag",
      type: 3,
      required: true,
    },
    {
      name: "time",
      description: "duration of tracking",
      value: "time",
      type: 4,
      required: true,
      choices: [
        { name: '30-minutes', value: 30 }, { name: '60-minutes', value: 60 }, { name: '90-minutes', value: 90 }, { name: '120-minutes', value: 120 },
      ]
    },
    {
      name: "event-name",
      description: "name of the event",
      value: "event-name",
      type: 3,
      required: true,
    },
    {
      name: "channel",
      description: "channel to host event",
      value: "channel",
      type: 7,
      channel_types: [0], // Restrict to text channel
      required: true,
    }]
  }, {
    name: "delete",
    description: "delete an active event",
    value: "delete",
    type: 2
  }],
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

      let events = GuildDB.events;

      switch(args[0].name) {

        case 'player-track':

          let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].options[0].value );
          if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[1].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

          let event = {
            name: args[0].options[2].value,
            gamertag: args[0].options[0].value,
            channel: args[0].options[3].value,
            time: args[0].options[1],
            creationDate: new Date(),
          };

          events.push(event);

          client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
            $set: {
              "server.events": events
            }
          }, function(err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });

          const successCreatePlayerTrack = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`**Success:** Successfully created **${event.name}** that will last **${event.time} minutes**`)

          return interaction.send({ embeds: [successCreatePlayerTrack] });

        case 'delete':

          if (GuildDB.events.length == 0) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription('**Notice:** No Existing Events to Delete.')] });

          let events = new SelectMenuBuilder()
            .setCustomId(`DeleteEvent-${interaction.member.user.id}`)
            .setPlaceholder(`Select an Event to Delete.`)

          for (let i = 0; i < GuildDB.events.length; i++) {
            events.addOptions({
              label: GuildDB.alarms[i].name,
              description: `Delete this Event`,
              value: GuildDB.alarms[i].name
            });
          }
          
          const eventsOptions = new ActionRowBuilder().addComponents(alarms);

          return interaction.send({ components: [eventsOptions], flags: (1 << 6) });

      }
  },

  Interactions: {

    DeleteEvent: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });



      }
    }

  }
}