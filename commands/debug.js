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

      if (client.config.Dev != 'DEV.') return interaction.send({ content: 'This command is not available to Production Version.' });

      let embed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Welcome** <@${interaction.member.user.id}> to **DayZ Reforger**\nTo gain access please use the command </gamertag-link:1>`);
    
      interaction.send({ embeds: [embed] });
    },
  },
}