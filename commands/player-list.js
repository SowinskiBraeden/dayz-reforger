const { FetchServerSettings } = require('../util/NitradoAPI');
const { Missions } = require('../database/destinations');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "player-list",
  debug: false,
  global: false,
  description: "Get current online players",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [],  
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }, start) => {

      if (!client.exists(GuildDB.Nitrado) || !client.exists(GuildDB.Nitrado.ServerID) || !client.exists(GuildDB.Nitrado.UserID) || !client.exists(GuildDB.Nitrado.Auth)) {
        const warnNitradoNotInitialized = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription("**WARNING:** The DayZ Nitrado Server has not been configured for this guild yet. This command or feature is currently unavailable.");

        return interaction.send({ embeds: [warnNitradoNotInitialized], flags: (1 << 6) });
      }

      await interaction.deferReply();

      const data = await FetchServerSettings(GuildDB.Nitrado, client, 'commands/player-list.js');  // Fetch server status
      const e = data && data !== 1; // Check if data exists
      
      const hostname      = e ? data.data.gameserver.settings.config.hostname : 'N/A';
      const map           = e ? Missions[data.data.gameserver.settings.config.mission] : 'N/A';
      const status        = e ? data.data.gameserver.status : 'N/A';
      const slots         = e ? data.data.gameserver.slots : 'N/A';
      const playersOnline = e ? data.data.gameserver.query.player_current : 'N/A';

      const Statuses = {
        "started": {emoji: "🟢", text: "Active"},
        "stopped": {emoji: "🔴", text: "Stopped"},
        "restarting": {emoji: "↻", text: "Restarting"},
      };

      const emojiStatus = e ? Statuses[status].emoji : "❓";
      const textStatus = e ? Statuses[status].text : "Unknown Status";

      let activePlayers = await client.dbo.collection("players").find({"connected": true}).toArray();

      let des = activePlayers.length > 0 ? `` : `**No Players Online**`;
      for (let i = 0; i < activePlayers.length; i++) {
        des += `**- ${activePlayers[i].gamertag}**\n`;
      }
      
      const nodes = activePlayers.length === 0;
      const serverEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle(`Online List - \` ${playersOnline === undefined ? activePlayers.length : playersOnline} \`  Player${playersOnline !== 1 ? 's' : ''} Online`)
        .addFields(
          { name: 'Server:', value: `\` ${hostname} \``, inline: false },
          { name: 'Map:', value: `\` ${map} \``, inline: true },
          { name: 'Status:', value: `\` ${emojiStatus} ${textStatus} \``, inline: true },
          { name: 'Slots:', value: `\` ${slots} \``, inline: true }
        );

      const activePlayersEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTimestamp()
        .setTitle(`Players Online:`)
        .setDescription(des || (nodes ? "No Players Online :(" : ""));

      return interaction.editReply({ embeds: [serverEmbed, activePlayersEmbed] });
    },
  },
}