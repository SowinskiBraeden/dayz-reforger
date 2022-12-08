const { SelectMenuBuilder, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const { Armbands } = require('../config/armbandsdb.js');

module.exports = {
  name: "armbands",
  debug: false,
  global: false,
  description: "view a list of armbads",
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
      
      let available = new SelectMenuBuilder()
        .setCustomId(`View-1-${interaction.member.user.id}`)
        .setPlaceholder('Select an armband from list 1 to claim')
      
      let availableNext = new SelectMenuBuilder()
        .setCustomId(`View-2-${interaction.member.user.id}`)
        .setPlaceholder('Select an armband from list 2 to claim')

      let tracker = 0;
      for (let i = 0; i < Armbands.length; i++) {
        tracker++;
        data = {
          label: Armbands[i].name,
          description: 'View this armband',
          value: Armbands[i].name,
        }

        if (GuildDB.usedArmbands.includes(Armbands[i].name)) data.label += ' - [ Claimed ]'

        if (tracker > 25) availableNext.addOptions(data);
        else available.addOptions(data);
      }

      let compList = []

      let opt = new ActionRowBuilder().addComponents(available);
      compList.push(opt)
      let opt2 = undefined;
      if (tracker > 25) {
        opt2 = new ActionRowBuilder().addComponents(availableNext);
        compList.push(opt2);
      } 

      return interaction.send({ components: compList, flags: (1 << 6) });
    },
  },
  Interactions: {
    View: {
      run: async (client, interaction, GuildDB) => {
        let armbandURL;

        for (let i = 0; i < Armbands.length; i++) {
          if (Armbands[i].name == interaction.values[0]) {
            armbandURL = Armbands[i].url;
            break;
          }
        }

        let armbandTitle = `${interaction.values[0]}${GuildDB.usedArmbands.includes(interaction.values[0]) ? ' - [ Claimed ]' : ''}`;

        const success = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle(armbandTitle)
          .setImage(armbandURL);

        return interaction.update({ embeds: [success], components: [] });
      }
    }
  }
}
