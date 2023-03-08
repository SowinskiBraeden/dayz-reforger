const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "debug",
  debug: true,
  global: true,
  description: "debug",
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
    run: async (client, interaction, args, { GuildDB }, start) => {
            
      client.updateLogs()

      return interaction.send({ content: 'debugging...' })
    },
  },
}