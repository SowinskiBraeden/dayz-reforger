const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: "gamertag-link",
  debug: false,
  global: false,
  description: "Connect DayZ account to gain server access",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
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

      let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].value );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

      if (client.exists(playerStat.discordID)) {
        const warnGTOverwrite = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Notice:**\n> The gamertag has previously been linked to <@${playerStat.discordID}>. Are you sure you would like to change this?`)
        
        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`OverwriteGamertag-yes-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`OverwriteGamertag-no-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Secondary)
          )

        return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });
      }

      playerStat.discordID = interaction.member.user.id;
      
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
        .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as your gamertag.`);

      return interaction.send({ embeds: [connectedEmbed] })
    },
  },

  Interactions: {

    OverwriteGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == interaction.customId.split('-')[2]);

          playerStat.discordID = interaction.member.user.id;
          
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
            .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as your gamertag.`);

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