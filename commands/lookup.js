const { EmbedBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

module.exports = {
  name: "lookup",
  debug: false,
  global: false,
  description: "Search for a users discord or gamertag",
  usage: "[option] [parameter]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "discord",
    description: "Find a Discord user from a Gamertag",
    value: "discord",
    type: CommandOptions.SubCommand,
    options: [{
      name: "gamertag",
      description: "Gamertag of player",
      value: "gamertag",
      type: CommandOptions.String,
      required: true,
    }]
  }, {
    name: "gamertag",
    description: "Find a Gamertag from a Discord user",
    value: "gamertag",
    type: CommandOptions.SubCommand,
    options: [{
      name: "user",
      description: "Discord User",
      value: "user",
      type: CommandOptions.User,
      required: true,
    }]
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

      if (args[0].name == 'discord') {

        let playerStat = await client.dbo.collection("players").findOne({"gamertag": args[0].options[0].value});
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[0].options[0].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });
  
        if (client.exists(playerStat.discordID)) {
          const found = new EmbedBuilder()
            .setColor(client.config.Colors.Yellow)
            .setDescription(`**Record Found**\n> The gamertag \` ${playerStat.gamertag} \` is currently linked to <@${playerStat.discordID}>.`)
          
          return interaction.send({ embeds: [found] });
        }
  
        let notFound = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Record Not Found**\n The gamertag \` ${playerStat.gamertag} \` currently has no linked Discord account.`);
  
        return interaction.send({ embeds: [notFound] })

      } else if (args[0].name == 'gamertag') {

        let playerStat = await client.dbo.collection("players").findOne({"discordID": args[0].options[0].value});
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** The user <@${args[0].options[0].value}> has not linked a gamertag.`)] });

        const found = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Record Found**\n> The user <@${playerStat.discordID}> has linked the gamertag \` ${playerStat.gamertag} \`.`)
        
        return interaction.send({ embeds: [found] });

      }
    },
  },
}