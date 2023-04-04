const { EmbedBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');
const { HandlePlayerBan } = require('../util/NitradoAPI');

module.exports = {
  name: "ban-player",
  debug: false,
  global: false,
  description: "Ban a player from the DayZ Server.",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "gamertag",
    description: "gamertag of the player to ban.",
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
    run: async (client, interaction, args, { GuildDB }, start) => {
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (GuildDB.hasBotAdmin && interaction.member.roles.filter(e => GuildDB.botAdminRoles.indexOf(e) !== -1).length > 0) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      HandlePlayerBan(client, args[0].value, true);

      let banned = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`Successfully **banned** **${args[0].value}** from the DayZ Server`);

      return interaction.send({ embeds: [banned] });
    },
  },
}