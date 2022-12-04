const { ModalBuilder } = require('discord.js');

module.exports = {
  name: "application",
  debug: false,
  global: false,
  description: "manage or create applications",
  usage: "[cmd] [opts]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "create",
      description: "Create a new application form",
      type: 1,
      value: "create",
      options: [
        {
          name: "title",
          description: "Application Title",
          value: "title",
          type: 3,
          max: 50,
          required: true,
        },
        {
          name: "description",
          description: "Application Description",
          value: "description",
          type: 3,
          max: 250,
          required: true,
        }
      ]
    }
  ],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/QuarksBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, start) => {
      if (args[0].name == 'create') {
        // Create the modal
        const modal = new ModalBuilder()
          .setCustomId('model-test')
          .setTitle(args[0].options[0].value);

        // Add components to modal

        // Create the text input components
        const favoriteColorInput = new TextInputBuilder()
          .setCustomId('favoriteColorInput')
            // The label is the prompt the user sees for this input
          .setLabel(args[0].options[1].value)
            // Short means only a single line of text
          .setStyle(TextInputStyle.Paragraph);

        // An action row only holds one text input,
        // so you need one action row per text input.
        const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
        const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);
      }
    },
  },
}