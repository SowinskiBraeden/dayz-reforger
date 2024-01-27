const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const { addUser } = require('../database/user');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "reset",
  debug: false,
  global: false,
  description: "Reset a user's bank/money",
  usage: "[user]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  options: [{
    name: "user",
    description: "User to reset",
    value: "user",
    type: CommandOptions.User,
    required: true,
  }],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      let canUseCommand = false;

      if (permissions.includes("MANAGE_GUILD")) canUseCommand = true;
      if (client.exists(GuildDB.botAdmin) && interaction.member.roles.includes(GuildDB.botAdmin)) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      const targetUserID = args[0].value.replace('<@!', '').replace('>', '');

      const prompt = new EmbedBuilder()
        .setTitle(`Are you sure you want to reset this user?`)
        .setDescription('**Notice:** This will reset this users cash and balance.')
        .setColor(client.config.Colors.Yellow)

      const opt = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
          .setCustomId(`Reset-yes-${targetUserID}-${interaction.member.user.id}`)
            .setLabel("Yes")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`Reset-no-${targetUserID}-${interaction.member.user.id}`)
            .setLabel("No")
            .setStyle(ButtonStyle.Success)
        )

      return interaction.send({ embeds: [prompt], components: [opt], flags: (1 << 6) });
      
    },
  },

  Interactions: {

    Reset: {
      run: async (client, interaction, GuildDB) => {
        const choice = interaction.customId.split('-')[1];
        const targetUserID = interaction.customId.split('-')[2];
    
        if (!interaction.customId.endsWith(interaction.member.user.id)) {
          return interaction.reply({
            content: "This button is not for you",
            flags: (1 << 6)
          })
        }
        if (choice=='yes') {
          const successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setTitle('Successfully reset user\'s data')

          let banking = await client.dbo.collection("users").findOne({"user.userID": interaction.member.user.id}).then(banking => banking);
      
          let bankingReset = false;
          if (!banking) bankingReset = true
          else banking = banking.user

          if (!bankingReset) {
            const success = addUser(banking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
            if (!success) {
              client.error(err);
              const embed = new EmbedBuilder()
                .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThis command has crashed\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
                .setColor(client.config.Colors.Red)

              return interaction.update({ embeds: [embed], components: [] });
            }
          }

          return interaction.update({ embeds: [successEmbed], components: [] });

        } else if (choice=='no') {
          const successEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Green)
            .setTitle(`The User was not reset`);

          return interaction.update({ embeds: [successEmbed], components: [] });
        }
      }
    }
  }
}