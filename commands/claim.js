const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
    run: async (client, interaction, args, GuildDB) => {
      if (!interaction.member.roles.includes(args[0].value)) {
        const invalidRoleEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription('**Notice:**\n> You cannot claim an armband for a role you don\'t have.');

        return interaction.send({ embeds: [invalidRoleEmbed] });
      }

      // If this faction has an existing record in the db
      if (GuildDB.factionArmbads[args[0].value]) {
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

        return interaction.send({ embeds: [warnArmbadChange], components: [opt] });
      }

      return interaction.send({ content: 'debug' });
    },
  },
  Interactions: {
    Claim: {
      run: async (client, interaction, GuildDB) => {
        
      }
    },

    ChangeArmband: {
      run: async (client, interaction, GuildDB) => {

      }
    }
  }
}
