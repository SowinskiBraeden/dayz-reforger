const { EmbedBuilder } = require("discord.js");
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const package = require("../package");

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
      type: CommandOptions.SubCommand,
      options: [{
        name: "command",
        description: "Get information on a specific command",
        value: "command",
        type: CommandOptions.String,
        required: false,
      }]
    },
    {
      name: "support",
      description: "Get support for Application",
      value: "support",
      type: CommandOptions.SubCommand,
    },
    { 
      name: "credits",
      description: "DayZ.R Bot Credits",
      value: "credits",
      type: CommandOptions.SubCommand,
    },
    {
      name: "stats",
      description: "Current Bot Statistics",
      value: "stats",
      type: CommandOptions.SubCommand,
    }
  ],
  SlashCommand: {
    /**
     *
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
     */

    run: async (client, interaction, args, {GuildDB}, start) => {
      if (args[0].name == 'commands') {
        let Commands = client.commands.filter((cmd) => {
          return !cmd.debug
        }).map((cmd) => 
            `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\` - ${cmd.description}`
        );
  
        let Embed = new EmbedBuilder()
          .setTitle('Commands')
          .setColor(client.config.Colors.Default)
          .setDescription(`${Commands.join("\n")}
    
    DayZR Bot Version: v${client.config.Version}`);
        if (!args[0].options[0]) return interaction.send({ embeds: [Embed] });
        else {
          let cmd =
            client.commands.get(args[0].options[0].value) ||
            client.commands.find(
              (x) => x.aliases && x.aliases.includes(args[0].options[0].value)
            );
          if (!cmd)
            return interaction.send({ content: `❌ | Unable to find that command.` });
  
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
          .setDescription(`**__DayZ.R Bot Support__**
          
            Are you experiencing troubles with the DayZ.R Bot?
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
          .setTitle('DayzRBot Credits')
          .setDescription(`
            **Bot Author:** mcdazzzled
            **Github:** https://github.com/SowinskiBraeden/dayz-reforger
            
            ${client.config.SupportServer}
          `);

        return interaction.send({ embeds: [creditsEmbed] })
      } else if (args[0].name == 'stats') {
        const end = new Date().getTime();
        
        const totalGuilds = await client.shard.fetchClientValues("guilds.cache.size").then(results => {
          return results.reduce((acc, guildCount) => acc + guildCount, 0);
        });
        
        const totalUsers = await client.shard.broadcastEval(c => {
          c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        }).then(data => data.reduce((acc, memberCount) => acc + memberCount, 0));
        
        const stats = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle('DayZ Reforger Bot Statistics')
          .addFields(
            { name: 'Guilds',          value: `\`\`\`${totalGuilds}\`\`\``,                                       inline: true },
            { name: 'Users',           value: `\`\`\`${totalUsers}\`\`\``,                                        inline: true },
            { name: 'Latency',         value: `\`\`\`${end - start}ms\`\`\``,                                     inline: true },
            { name: 'Uptime',          value: `\`\`\`${client.secondsToDhms(process.uptime().toFixed(2))}\`\`\``, inline: true },
            { name: 'Bot Version',     value: `\`\`\`${client.config.Dev} v${client.config.Version}\`\`\``,       inline: true },
            { name: 'Discord Version', value: `\`\`\`Discord.js ${package.dependencies["discord.js"]}\`\`\``,     inline: true },
          );

        return interaction.send({ embeds: [stats] })
      }
    },
  },
};