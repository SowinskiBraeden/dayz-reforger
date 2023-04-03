const { EmbedBuilder } = require('discord.js');
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

      playerStat.discordID = args[0].value;
      
      let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
      GuildDB.playerstats[playerStatIndex] = playerStat;

      client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
        $set: {
          'server.playerstats': GuildDB.playerstats,
        }
      })

      const role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
      const member = interaction.guild.members.cache.get(interaction.member.user.id);
      member.roles.add(role);

      let connectedEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as <@${args[0].value}>'s gamertag.`);

      return interaction.send({ embeds: [connectedEmbed] })
    },
  },
}