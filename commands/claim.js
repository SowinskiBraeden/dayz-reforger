const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Armbands } = require('../config/armbandsdb.js');

module.exports = {
  name: "claim",
  debug: false,
  global: false,
  description: "claim an available armband for your ",
  usage: "[role]",
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
     * @param {require("../structures/DayzRBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id))
        return interaction.send({ content: `You are not allowed to use the bot in this channel.`,  flags: (1 << 6) });

      // Handle invalid roles
      let des;
      if (GuildDB.excludedRoles.includes(args[0].value)) des = '**Notice:**\n> This role has been configured to be excluded to claim an armband.';
      if (!interaction.member.roles.includes(args[0].value)) des = '**Notice:**\n> You cannot claim an armband for a role you don\'t have.';
      if (des) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(des)], flags: (1 << 6) });

      for (let roleID in Object(GuildDB.factionArmbands)) {
        if (interaction.member.roles.includes(roleID) && roleID != args[0].value) {
          return interaction.send({ embeds: [
            new EmbedBuilder()
              .setColor(client.config.Colors.Yellow)
              .setDescription('**Notice:**\n> You already have another role with a claimed flag.')
          ], flags: (1 << 6) })
        }
      }

      // If this faction has an existing record in the db
      if (GuildDB.factionArmbands[args[0].value]) {
        const warnArmbadChange = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Notice:**\n> The faction <@&${args[0].value}> already has an armband selected. Are you sure you would like to change this?`)
        
        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`ChangeArmband-yes-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`ChangeArmband-no-${args[0].value}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Secondary)
          )

        return interaction.send({ embeds: [warnArmbadChange], components: [opt] });
      }

      let available = new StringSelectMenuBuilder()
        .setCustomId(`Claim-${args[0].value}-1-${interaction.member.user.id}`)
        .setPlaceholder('Select an armband from list 1 to claim')
      
      let availableNext = new StringSelectMenuBuilder()
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

        let query = {
          $push: {
            'server.usedArmbands': interaction.values[0]
          },
          $set: {
            [`server.factionArmbands.${factionID}`]: data
          },
        };

        if (interaction.customId.split('-')[2] == 'update') {
          let removeQuery;
          for (const [fid, data] of Object.entries(GuildDB.factionArmbands)) {
            if (fid == factionID) removeQuery = data.armband;
          }
          client.dbo.collection("guilds").updateOne({'server.serverID': GuildDB.serverID}, {$pull: {'server.usedArmbands': removeQuery}}, function (err, res) {
            if (err) return client.sendInternalError(interaction, err);
          })
        }
        
        client.dbo.collection("guilds").updateOne({'server.serverID': GuildDB.serverID}, query, function (err, res) {
          if (err) return client.sendInternalError(interaction, err);
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
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let available = new StringSelectMenuBuilder()
            .setCustomId(`Claim-${interaction.customId.split('-')[2]}-update-1-${interaction.member.user.id}`)
            .setPlaceholder('Select an armband from list 1 to claim')
          
          let availableNext = new StringSelectMenuBuilder()
            .setCustomId(`Claim-${interaction.customId.split('-')[2]}-update-2-${interaction.member.user.id}`)
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

          return interaction.update({ embeds: [], components: compList });  

        } else {
          const cancel = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription('**Canceled**\n> Your factions armband will remain the same');

          return interaction.update({ embeds: [cancel], components: [] });
        }
      }
    }
  }
}
