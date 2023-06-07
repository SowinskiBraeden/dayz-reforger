const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "admin-gamertag-link",
  debug: false,
  global: false,
  description: "Connect a users gamertag for them",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "user",
    description: "User to link gamertag to",
    value: "user",
    type: 6,
    required: true,
  },
  {
    name: "gamertag",
    description: "Gamertag of player",
    value: "gamertag",
    type: 3,
    required: true,
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

      if (!client.exists(GuildDB.playerstats)) {
        GuildDB.playerstats = [{}];
        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            "server.playerstats": []
          }
        }, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });
      }

      let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[1].value );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[1].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

      if (client.exists(playerStat.discordID)) {
        const warnGTOverwrite = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Notice:**\n> The gamertag has previously been linked to <@${playerStat.discordID}>. Are you sure you would like to change this?`)
        
        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`AdminOverwriteGamertag-yes-${args[1].value}-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`AdminOverwriteGamertag-no-${args[1].value}-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Secondary)
          )

        return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });
      }

      playerStat.discordID = args[0].value;
      
      let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
      GuildDB.playerstats[playerStatIndex] = playerStat;

      client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
        $set: {
          'server.playerstats': GuildDB.playerstats,
        }
      })

      let member = interaction.guild.members.cache.get(args[0].value);
      if (client.exists(GuildDB.linkedGamertagRole)) {
        let role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
        member.roles.add(role);
      }

      if (client.exists(GuildDB.memberRole)) {
        let role = interaction.guild.roles.cache.get(GuildDB.memberRole);
        member.roles.add(role);
      }

      let connectedEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as <@${args[0].value}>'s gamertag.`);

      return interaction.send({ embeds: [connectedEmbed] })
    },
  },

  Interactions: {

    AdminOverwriteGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == interaction.customId.split('-')[3]);

          playerStat.discordID = interaction.customId.split('-')[2];
          
          let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
          GuildDB.playerstats[playerStatIndex] = playerStat;

          client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
            $set: {
              'server.playerstats': GuildDB.playerstats,
            }
          });

          let member = interaction.guild.members.cache.get(interaction.member.user.id);
          if (client.exists(GuildDB.linkedGamertagRole)) {
            let role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
            member.roles.add(role);
          }

          if (client.exists(GuildDB.memberRole)) {
            let role = interaction.guild.roles.cache.get(GuildDB.memberRole);
            member.roles.add(role);
          }

          let connectedEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as <@${interaction.customId.split('-')[2]}>'s gamertag.`);

          return interaction.update({ embeds: [connectedEmbed], components: [] });

        } else {
          const cancel = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription('**Canceled**\n> The gamertag link will not be overwritten');

          return interaction.update({ embeds: [cancel], components: [] });
        }
      }
    }

  }
}