const { ModalBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: "channels",
  debug: false,
  global: false,
  description: "view a list of allowed channels",
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
  Interactions: {
    ViewArmbads: {
      run: async (client, interaction) => {
        
      }
    }
  }
}
