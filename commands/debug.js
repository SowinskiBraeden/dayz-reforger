const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

module.exports = {
  name: "debug",
  debug: true,
  global: false,
  description: "debugging...",
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
      if (!client.config.Admins.includes(interaction.member.user.id)) return interaction.send({ content: 'Only developers can access this command.', flags: (1 << 6) })
      
      return interaction.send({ content: `Hello ${interaction.member.user.id}, you are my creator!!` })
    },
  },
  Interactions: {}
}