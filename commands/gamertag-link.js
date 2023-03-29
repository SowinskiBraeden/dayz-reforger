const { EmbedBuilder } = require('discord.js');

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
    description: "Gamertag of player for bounty",
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
        this.dbo.collection("guilds").updateOne({ "server.serverID": guild.serverID }, {
          $set: {
            "server.playerstats": []
          }
        }, function (err, res) {
          if (err && this.exists(channel)) return this.sendInternalError(channel, err);
        });
      }

      let playerStat = GuildDB.playerstats.find(stat => stat.player == args[0].value[0] );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least ` 5 minutes `.')] });

      playerStat.discordID = interaction.member.user.id;
      
      let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
      let playerstats = GuildDB.playerstats;
      playerstats[playerStatIndex] = playerStatIndex;

      client.dbo.collectin("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
        $set: {
          'server.playerstats': playerstats,
        }
      })

      const role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
      const member = interaction.guild.members.cache.get(interaction.member.user.id);
      member.roles.add(role);

      let connectedEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`Successfully connected \` ${playerstats.gamertag} \` as your gamertag.`);

      return interaction.send({ embeds: [connectedEmbed] })
    },
  },
}