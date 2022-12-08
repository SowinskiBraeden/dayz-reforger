const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "factions",
  debug: false,
  global: false,
  description: "view the armband of a faction",
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
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id))
        return interaction.send({ content: `You are not allowed to use the bot in this channel.`,  flags: (1 << 6) }); 
      
      let factions = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle('Factions & Armbands')
        
      let description = '';
      
      if (GuildDB.usedArmbands.length == 0) {
        description = '> There are no factions that have claimed armbands.';
      } else {
        for (const [factionID, data] of Object.entries(GuildDB.factionArmbands)) {
          if (description == "") description += `> <@&${factionID}> - ${data.armband}`;
          else description += `\n> <@&${factionID}> - *${data.armband}*`;
        }
      }

      factions.setDescription(description);

      return interaction.send({ embeds: [factions] });
    },
  },
  Interactions: {}
}
