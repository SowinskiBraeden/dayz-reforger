const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "admin-gamertag-unlink",
  debug: false,
  global: false,
  description: "Disconnect a users gamertag for them",
  usage: "[user]",
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

      let playerStat = GuildDB.playerstats.find(stat => stat.discordID == args[0].value );
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** <@${args[0].value}> has no gamertag linked.`)] });

      const warnGTOverwrite = new EmbedBuilder()
        .setColor(client.config.Colors.Yellow)
        .setDescription(`**Notice:**\n> This action will unlink the gamertag \` ${playerStat.gamertag} \` from the user <@${playerStat.discordID}>. Are you sure you would like to continue?`)
      
      const opt = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`AdminUnlinkGamertag-yes-${args[0].value}-${interaction.member.user.id}`)
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`AdminUnlinkGamertag-no-${args[0].value}-${interaction.member.user.id}`)
            .setLabel("No")
            .setStyle(ButtonStyle.Secondary)
        )

      return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });

    },
  },

  Interactions: {

    AdminUnlinkGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.discordID == interaction.customId.split('-')[2]);

          playerStat.discordID = "";
          
          let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
          GuildDB.playerstats[playerStatIndex] = playerStat;

          client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
            $set: {
              'server.playerstats': GuildDB.playerstats,
            }
          });

          let connectedEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`Successfully unlinked \` ${playerStat.gamertag} \` from <@${interaction.customId.split('-')[2]}>.`);

          return interaction.update({ embeds: [connectedEmbed], components: [] });

        } else {
          const cancel = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription('**Canceled**\n> The gamertag unlink will not processed.');

          return interaction.update({ embeds: [cancel], components: [] });
        }
      }
    }

  }
}