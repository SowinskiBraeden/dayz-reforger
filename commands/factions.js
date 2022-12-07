const { ModalBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: "factions",
  debug: false,
  global: false,
  description: "view the armband of a faction",
  usage: "[cmd] [opts]",
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
    run: async (client, interaction, args) => {
      
    },
  },
  Interactions: {}
}
