const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, InteractionCollector } = require('discord.js');
const { Armbands } = require('../config/armbandsdb.js');

module.exports = {
  name: "claim",
  debug: false,
  global: false,
  description: "claim an available armband for your ",
  usage: "[cmd] [opts]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "faction_role",
    description: "Claim an armband for this faction role.",
    value: "faction_role",
    type: 8,
    required: true,
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
      if (!interaction.member.roles.includes(args[0].value)) {
        const invalidRoleEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription('**Notice:**\n> You cannot claim an armband for a role you don\'t have.');

        return interaction.send({ embeds: [invalidRoleEmbed], flags: (1 << 6) });
      }

      // If this faction has an existing record in the db
      if (GuildDB.factionArmbands[args[0].value]) {
        const warnArmbadChange = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Notice:**\n> The faction <@&${args[0].value}> already has an armband selected. Are you sure you would like to change this?`)
        
        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`ChangeArmband-yes-${interaction.member.user.id}-${args[0].value}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`ChangeArmband-no-${interaction.member.user.id}-${args[0].value}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Secondary)
          )

        return interaction.send({ embeds: [warnArmbadChange], components: [opt], flags: (1 << 6) });
      }

      let available = new SelectMenuBuilder()
        .setCustomId(`Claim-${args[0].value}-1-${interaction.member.user.id}`)
        .setPlaceholder('Select an armband from list 1 to claim')
      
      let availableNext = new SelectMenuBuilder()
        .setCustomId(`Claim-${args[0].value}-2-${interaction.member.user.id}`)
        .setPlaceholder('Select an armband from list 2 to claim')

      let tracker = 0;
      for (let i = 0; i < Armbands.length; i++) {
        if (!GuildDB.usedArmbands.includes(Armbands[i].name)) {
          tracker++;
          data = {
            label: Armbands[i].name,
            description: 'Select this armband',
            value: Armbands[i].name,
          }
          if (tracker > 25) availableNext.addOptions(data);
          else available.addOptions(data);
        }
      }

      let compList = []

      let opt = new ActionRowBuilder().addComponents(available);
      compList.push(opt)
      let opt2 = undefined;
      if (tracker > 25) {
        opt2 = new ActionRowBuilder().addComponents(availableNext);
        compList.push(opt2);
      } 

      return interaction.send({ components: compList });
    },
  },
  Interactions: {
    Claim: {
      run: async (client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        let factionID = interaction.customId.split('-')[1];

        let data = {
          faction: factionID,
          armband: interaction.values[0],
        };
        client.dbo.collection("guilds").updateOne({'server.serverID': GuildDB.serverID}, {$push: {'server.usedArmbands': interaction.values[0]}, $set: {[`server.factionArmbands.${factionID}`]: data}}, function (err, res) {
          if (err) return client.sendInternalError(interacction, err);
        })

        let armbandURL;

        for (let i = 0; i < Armbands.length; i++) {
          if (Armbands[i].name == interaction.values[0]) {
            armbandURL = Armbands[i].url;
            break;
          }
        }

        const success = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Success!**\n> The faction <@&${factionID}> has now claimed ***${interaction.values[0]}***`)
          .setImage(armbandURL);

        return interaction.update({ embeds: [success], components: [] });
      }
    },

    ChangeArmband: {
      run: async (client, interaction, GuildDB) => {

      }
    }
  }
}
