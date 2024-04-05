const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const { UpdatePlayer } = require('../database/player');

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

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }

      let playerStat = await client.dbo.collection("players").findOne({"discordID": interaction.member.user.id});
      if (!client.exists(playerStat)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**No Gamertag Linked** It Appears your don't have a gamertag linked to your account.`)] });

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
          let playerStat = await client.dbo.collection("players").findOne({"discordID": interaction.member.user.id});

          playerStat.discordID = "";
          
          await UpdatePlayer(client, playerStat, interaction);

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