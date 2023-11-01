const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;
const { weapons } = require('../database/weapons');
const { insertPVPstats } = require('../database/player');

module.exports = {
  name: "weapon-stats",
  debug: false,
  global: false,
  description: "Check player statistics",
  usage: "[category] [user or gamertag]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "category",
    description: "Weapon Category",
    value: "category",
    type: CommandOptions.String,
    required: true,
    choices: [
      { name: "Handguns", value: "handguns" },
      { name: "Shotguns", value: "shotguns" },
      { name: "Submachine Guns", value: "subMachineGuns" },
      { name: "Assault Rifles", value: "assaultRifles" },
      { name: "Battle Rifles", value: "battleRifles" },
      { name: "Bolt-action Rifles", value: "boltActionRifles" },
      { name: "Break-action Rifles", value: "breakActionRifles" },
      { name: "Lever-action Rifles", value: "leverActionRifles" },
      { name: "Marksman Rifles", value: "marksmanRifles" },
      { name: "Semi-automatic Rifles", value: "semiAutomaticRifles" },
      { name: "Other", value: "other" },
    ]
  }, {
    name: "discord",
    description: "discord user to lookup stats",
    value: "discord",
    type: CommandOptions.User,
    required: false,
  }, {
    name: "gamertag",
    description: "gamertag to lookup stats",
    type: CommandOptions.String,
    required: false,
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
      let discord  = args[1] && args[1].name == 'discord'  ? args[1].value : undefined;
      let gamertag = args[1] && args[1].name == 'gamertag' ? args[1].value : undefined;
      let self = !discord && !gamertag; // searching for self if both discord and gamertag are undefined
      const weaponClass = args[0].value;

      let query;

      // Searching by Discord
      if (discord) query = await client.dbo.collection("players").findOne({"discordID": discord});
  
      // Searching by Gamertag
      if (gamertag) query = await client.dbo.collection("players").findOne({"gamertag": gamertag});
      
      // Searching for self
      if (self) query = await client.dbo.collection("players").findOne({"discordID": interaction.member.user.id});
    
      if (!client.exists(query)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** Unable to find any records with the gamertag or user provided.`)] });

      let weaponSelect = new StringSelectMenuBuilder()
        .setCustomId(`ViewWeaponStats-${query.playerID}-${interaction.member.user.id}`)
        .setPlaceholder(`Select an weapon to view stat.`)

      for (const [name, _] of Object.entries(weapons[weaponClass])) {
        weaponSelect.addOptions({
          label: name,
          description: `View this weapon's stats.`,
          value: name,
        });
      }

      const opt = new ActionRowBuilder().addComponents(weaponSelect);

      return interaction.send({ components: [opt] });
    },
  },

  Interactions: {
    ViewWeaponStats: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id))
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });
        
        const weapon = interaction.values[0];
        const playerID = interaction.customId.split('-')[1];
        let player = await client.dbo.collection("players").findOne({"playerID": playerID});
        const tag = player.discordID != "" ? `<@${player.discordID}>'s` : `**${player.gamertag}'s**>`;

        if (!client.exists(player.shotsLanded)) player = insertPVPstats(player);

        let stats = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`${tag} stats for the ${weapon}`)
          .setThumbnail(weapons[weapon])
          .addFields(
            { name: `Shots Landed`, value: `${player.weaponStats[weapon].shotsLanded}`, inline: true },
            { name: `Times Shot`, value: `${player.weaponStats[weapon].timesShot}`, inline: true },
          );

        const chart = {
          type: 'bar',
          data: {
            labels: ['Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'],
            datasets: [{
              label: `Shots landed with a ${weapon}`,
              data: [
                player.shotsLandedPerBodyPart.Head,
                player.shotsLandedPerBodyPart.Torso,
                player.shotsLandedPerBodyPart.LeftArm,
                player.shotsLandedPerBodyPart.RightArm,
                player.shotsLandedPerBodyPart.LeftLeg,
                player.shotsLandedPerBodyPart.RightLeg,
              ],
            }, {
              label: `Times Shot by a ${weapon}`,
              data: [
                player.timesShotPerBodyPart.Head,
                player.timesShotPerBodyPart.Torso,
                player.timesShotPerBodyPart.LeftArm,
                player.timesShotPerBodyPart.RightArm,
                player.timesShotPerBodyPart.LeftLeg,
                player.timesShotPerBodyPart.RightLeg,
              ],
            }],
          },
        };
        
        const encodedChart = encodeURIComponent(JSON.stringify(chart));
        const chartURL = `https://quickchart.io/chart?c=${encodedChart}`;
        
        stats.setImage(chartURL);
      
        return interaction.update({ components: [], embeds: [stats] });
      }
    }
  }
}
