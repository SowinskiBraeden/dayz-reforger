const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "excluded",
  debug: false,
  global: false,
  description: "view a list of excluded roles",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.excludedRoles.length == 0) {
        let noExcludes = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle('Excluded Roles')
          .setDescription('> There have been no configured channels');

        return interaction.send({ embeds: [noExcludes] });
      }

      let excluded = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle('Channels')

      let des = '*These roles you cannot use to claim an armband.';
      for (let i = 0; i < GuildDB.excludedRoles.length; i++) {
        des += `\n> <@&${GuildDB.excludedRoles[i]}>`;
      }
      excluded.setDescription(des);

      return interaction.send({ embeds: [excluded] });
    },
  },
  Interactions: {}
}
