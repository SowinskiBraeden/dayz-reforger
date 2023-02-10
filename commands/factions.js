const { EmbedBuilder } = require('discord.js');
const { Armbands } = require('../config/armbandsdb.js');

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
  options: [{
    name: "faction_role",
    description: "View a specific faction's armband by role",
    value: "faction_role",
    type: 8,
    required: false,
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
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id))
        return interaction.send({ content: `You are not allowed to use the bot in this channel.`,  flags: (1 << 6) }); 
      
      // Return list of factions and their armband.
      if (!args) {

        let factions = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setTitle('Factions & Armbands')
          
        let description = '';

        if (GuildDB.usedArmbands.length == 0) {
          description = '> There are no factions that have claimed armbands.';
        } else {
          for (const [factionID, data] of Object.entries(GuildDB.factionArmbands)) {
            const guild = client.guilds.cache.get(GuildDB.serverID);
            const role = guild.roles.cache.find(role => role.id == factionID);
            if (!role) {
              let query = {
                $pull: { 'server.usedArmbands': data.armband },
                $unset: { [`server.factionArmbands.${factionID}`]: "" },
              };
              client.dbo.collection("guilds").updateOne({'server.serverID': GuildDB.serverID}, query, function (err, res) {
                if (err) return client.sendInternalError(interaction, err);
              });
              continue;
            }
            if (description == "") description += `> <@&${factionID}> - ${data.armband}`;
            else description += `\n> <@&${factionID}> - *${data.armband}*`;
          }
        }
  
        factions.setDescription(description);
  
        return interaction.send({ embeds: [factions] });
      }

      // Else return specific faction and their armband.
      if (!GuildDB.factionArmbands[args[0].value]) {
        return interaction.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.config.Colors.Yellow)
              .setDescription(`**Notice:**\n> The faction <@&${args[0].value}> has not claimed an armband.`)
          ],
          flags: (1 << 6)
        });
      }

      let armbandURL;

      for (let i = 0; i < Armbands.length; i++) {
        if (Armbands[i].name == GuildDB.factionArmbands[args[0].value].armband) {
          armbandURL = Armbands[i].url;
          break;
        }
      }

      const faction = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`> Faction <@&${GuildDB.factionArmbands[args[0].value].faction}> - ***${GuildDB.factionArmbands[args[0].value].armband}***`)
        .setImage(armbandURL);

      return interaction.send({ embeds: [faction] });
    },
  },
  Interactions: {}
}
