const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');

module.exports = {
  name: "gamertag-unlink",
  debug: false,
  global: false,
  description: "Disconnect DayZ stats from your Discord",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
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
        }, (err, res) => {
          if (err) return client.sendInternalError(interaction, err);
        });
      }

      let playerStat = GuildDB.playerstats.find(stat => stat.discordID == interaction.member.user.id);
      if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**No Gamertag Linked** It Appears your don't have a gamertag linked to your account.`)] });

      const warnGTOverwrite = new EmbedBuilder()
        .setColor(client.config.Colors.Yellow)
        .setDescription(`**Notice:**\n> Are you sure you want to unlink your gamertag? This will limit some automatic features.`);
      
      const opt = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`UnlinkGamertag-yes-${interaction.member.user.id}`)
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`UnlinkGamertag-no-${interaction.member.user.id}`)
            .setLabel("No")
            .setStyle(ButtonStyle.Secondary)
        )

      return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });
    },
  },

  Interactions: {

    UnlinkGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.discordID == interaction.member.user.id);

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
            .setDescription(`Successfully unlinked \` ${playerStat.gamertag} \` as your gamertag.`);

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