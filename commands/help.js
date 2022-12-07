const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  debug: false,
  global: true,
  description: "Get information on a specific command",
  usage: "[option]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "commands",
      description: "List all commands",
      value: "commands",
      type: 1,
      options: [{
        name: "command",
        description: "Get information on a specific command",
        value: "command",
        type: 3,
        required: false,
      }]
    },
    {
      name: "support",
      description: "Get support for Applicatz",
      value: "support",
      type: 1,
    },
    { 
      name: "credits",
      description: "DayzArmbands Credits",
      value: "credits",
      type: 1,
    },
    {
      name: "version",
      description: "Current version of the bot",
      value: "version",
      type: 1,
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

    run: async (client, interaction, args) => {
    if (args[0].name == 'version') {
      const versionEmbed = new EmbedBuilder()
        .setTitle(`Current DayzArmbands Version`)
        .setDescription(client.config.Version);

      return interaction.send({ embeds: [versionEmbed] });
    } else if (args[0].name == 'commands') {
        let Commands = client.commands.filter((cmd) => {
          return !cmd.debug
        }).map((cmd) => 
            `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\` - ${cmd.description}`
        );
  
        let Embed = new EmbedBuilder()
          .setTitle('Commands')
          .setColor(client.config.Colors.Default)
          .setDescription(`${Commands.join("\n")}
    
    DayzArmbands Version: v${client.config.Version}`);
        if (!args[0].options[0]) return interaction.send({ embeds: [Embed] });
        else {
          let cmd =
            client.commands.get(args[0].options[0].value) ||
            client.commands.find(
              (x) => x.aliases && x.aliases.includes(args[0].options[0].value)
            );
          if (!cmd)
            return client.sendError(
              interaction,
              `❌ | Unable to find that command.`
            );
  
          let embed = new EmbedBuilder()
            .setDescription(cmd.description)
            .setColor(client.config.Colors.Green)
            .setTitle(`How to use /${cmd.name} command`)

          if (cmd.SlashCommand.options && cmd.SlashCommand.options[0].type == 1) {
            let description = `${cmd.description}\n\n**Usage**\n`;
  
            for (let i = 0; i < cmd.SlashCommand.options.length; i++) {
              if (cmd.SlashCommand.options[i].type == 1) {
                let param = '';
                if (cmd.SlashCommand.options[i].options) {
                  param = cmd.SlashCommand.options[i].options.length > 0 ? ' ' : '';
                  for (let j = 0; j < cmd.SlashCommand.options[i].options.length; j++) {
                    if (cmd.SlashCommand.options[i].options[j].required) param += `[${cmd.SlashCommand.options[i].options[j].name}] `
                  }
                }
                description += `\`/${cmd.name} ${cmd.SlashCommand.options[i].name}${param}\`\n${cmd.SlashCommand.options[i].description}\n\n`
              }
            }
            embed.setDescription(description);
          } else embed.addFields({ name: "Usage", value: `\`/${cmd.name}\`${cmd.usage ? " " + cmd.usage : ""}`, inline: true })

          return interaction.send({ embeds: [embed] });
        }
      } else if (args[0].name == 'support') {
        const supportEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**__DayzArmbands Support__**
          
            Are you experiencing troubles with DayzArmbands?
            Do you have questions or concerns?
            Do you require help to use the bot?
            Do you have a feature you'd like to see?

            Join the support server to have all your needs fulfilled.
            ╚➤ ${client.config.SupportServer}
          `)

        return interaction.send({ embeds: [supportEmbed] });

      } else if (args[0].name == 'credits') {
        const creditsEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle('QuarksBot Credits')
          .setDescription(`
            **Bot Author:** McDazzzled#5307
            
            ${client.config.SupportServer}
          `);

        return interaction.send({ embeds: [creditsEmbed] })
      }
    },
  },
};