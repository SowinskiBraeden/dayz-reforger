const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "bounty",
  debug: false,
  global: false,
  description: "Set or view bounties",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "set",
    description: "Set a bounty on a player",
    value: "set",
    type: 1,
    options: [{
      name: "gamertag",
      description: "Gamertag of player for bounty",
      value: "gamertag",
      type: 3,
      required: true,
    }, {
      name: "value",
      description: "Amount of the bounty",
      value: "value",
      type: 10,
      min_value: 0.01,
      required: true
    }]
  }, {
    name: "view",
    description: "View all active bounties",
    value: "view",
    type: 1,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {

      if (args[0].name == 'set') {



      } else if (args[0].name == 'view') {

      }
    },
  },
}