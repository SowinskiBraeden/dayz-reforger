const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "channels",
  debug: false,
  global: false,
  description: "view a list of allowed channels",
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
    run: async (client, interaction, args, { GuildDB }) => {
      if (!GuildDB.customChannelStatus) {
        let noChannels = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle('Channels')
          .setDescription('> There are no configured channels');

        return interaction.send({ embeds: [noChannels] });
      }

      let channels = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle('Channels')

      let des = '';
      for (let i = 0; i < GuildDB.allowedChannels.length; i++) {
        if (i == 0) des += `> <#${GuildDB.allowedChannels[i]}>`;
        else des += `\n> <#${GuildDB.allowedChannels[i]}>`;
      }
      channels.setDescription(des);

      return interaction.send({ embeds: [channels] });
    },
  },
  Interactions: {}
}
