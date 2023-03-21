const { EmbedBuilder, } = require('discord.js');
const { Inventory, addInventory } = require('../structures/inventory');
const { Bank, addBank } = require('../structures/bank');

module.exports = {
  name: "collect-income",
  debug: false,
  global: false,
  description: "Collect Your Income",
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
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send({ content: `You are not allowed to use the bot in this channel.`,  flags: (1 << 6) }); 
      }

      const hasIncomeRole = GuildDB.incomeRoles.some(data => {
        if (interaction.member.roles.includes(data.role)) return true;
        return false;
      });

      if (!hasIncomeRole) {
        const error = new EmbedBuilder()
          .setColor(client.config.Colors.Red)
          .setTitle('No Income!')
          .setDescription(`It appears you don't have any roles to earn income.`)

        return interaction.send({ embeds: [error] })
      }

      
    },
  },
}