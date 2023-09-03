const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');
const { BanPlayer, UnbanPlayer, RestartServer } = require('../util/NitradoAPI');
const { Armbands } = require('../config/armbandsdb.js');

module.exports = {
  name: "admin",
  debug: false,
  global: false,
  description: "Connect a users gamertag for them",
  usage: "[user] [gamertag]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "gamertag-link",
    description: "link a gamertag for a user",
    value: "gamertag-link",
    type: 1,
    options: [{
      name: "user",
      description: "User to link gamertag to",
      value: "user",
      type: 6,
      required: true,
    },
    {
      name: "gamertag",
      description: "Gamertag of player",
      value: "gamertag",
      type: 3,
      required: true,
    }]
  }, {
    name: "gamertag-unlink",
    description: "unlink a gamertag for a user",
    value: "gamertag-unlink",
    type: 1,
    options: [{
      name: "user",
      description: "User to link gamertag to",
      value: "user",
      type: 6,
      required: true,
    }]
  }, {
    name: "claim-armband",
    description: "Claim an armband for a faction",
    value: "claim-armband",
    type: 1,
    options: [{
      name: "faction_role",
      description: "Claim an armband for this faction role.",
      value: "faction_role",
      type: 8,
      required: true,
    }]
  }, {
    name: "bounty-clear",
    description: "clear a bounty off a player",
    value: "bounty-clear",
    type: 1,
    options: [{
      name: "gamertag",
      description: "Gamertag of player",
      value: "gamertag",
      type: 3,
      required: true,
    }]
  }, {
    name: "ban-player",
    description: "Ban a player from the DayZ server",
    value: "ban-player",
    type: 1,
    options: [{
      name: "gamertag",
      description: "gamertag of the player to ban.",
      value: "gamertag",
      type: 3,
      required: true,
    }]
  }, {
    name: "unban-player",
    description: "Unban a player from the DayZ server",
    value: "unban-player",
    type: 1,
    options: [{
      name: "gamertag",
      description: "gamertag of the player to unban.",
      value: "gamertag",
      type: 3,
      required: true,
    }]
  }, {
    name: "add-money",
    description: "Add money to user",
    value: "add",
    type: 1,
    options: [
      {
        name: "amount",
        description: "The amount to add to balance",
        value: "amount",
        type: 10,
        min_value: 0.01,
        required: true,
      },
      {
        name: "to",
        description: "User to alter balance",
        value: "to",
        type: 6,
        required: true,
      },
    ]
  },
  {
    name: "remove-money",
    description: "Remove or remove money from a user",
    value: "remove",
    type: 1,
    options: [
      {
        name: "amount",
        description: "The amount to add to balance",
        value: "amount",
        type: 10,
        min_value: 0.01,
        required: true,
      },
      {
        name: "from",
        description: "User to alter balance",
        value: "from",
        type: 6,
        required: true,
      },
    ]
  }, {
    name: "restart",
    description: "Restart the DayZ Server",
    value: "restart",
    type: 1,
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
      if (GuildDB.hasBotAdmin && interaction.member.roles.filter(e => GuildDB.botAdminRoles.indexOf(e) !== -1).length > 0) canUseCommand = true;
      if (!canUseCommand) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      if (args[0].name == 'gamertag-link') {

        if (!client.exists(GuildDB.playerstats)) {
          GuildDB.playerstats = [{}];
          client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
            $set: {
              "server.playerstats": []
            }
          }, function (err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });
        }

        let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].options[1].value );
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** This gamertag \` ${args[1].value} \` cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least \` 5 minutes \`.`)] });

        if (client.exists(playerStat.discordID)) {
          const warnGTOverwrite = new EmbedBuilder()
            .setColor(client.config.Colors.Yellow)
            .setDescription(`**Notice:**\n> The gamertag has previously been linked to <@${playerStat.discordID}>. Are you sure you would like to change this?`)
          
          const opt = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`AdminOverwriteGamertag-yes-${args[0].options[1].value}-${args[0].options[0].value}-${interaction.member.user.id}`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`AdminOverwriteGamertag-no-${args[0].options[1].value}-${args[0].options[0].value}-${interaction.member.user.id}`)
                .setLabel("No")
                .setStyle(ButtonStyle.Secondary)
            )

          return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });
        }

        playerStat.discordID = args[0].options[0].value;
        
        let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
        GuildDB.playerstats[playerStatIndex] = playerStat;

        client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
          $set: {
            'server.playerstats': GuildDB.playerstats,
          }
        })

        let member = interaction.guild.members.cache.get(args[0].options[0].value);
        if (client.exists(GuildDB.linkedGamertagRole)) {
          let role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
          member.roles.add(role);
        }

        if (client.exists(GuildDB.memberRole)) {
          let role = interaction.guild.roles.cache.get(GuildDB.memberRole);
          member.roles.add(role);
        }

        let connectedEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as <@${args[0].options[0].value}>'s gamertag.`);

        return interaction.send({ embeds: [connectedEmbed] })
      
      } else if (args[0].name == 'gamertag-unlink') {

        if (!client.exists(GuildDB.playerstats)) {
          GuildDB.playerstats = [{}];
          client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
            $set: {
              "server.playerstats": []
            }
          }, function (err, res) {
            if (err) return client.sendInternalError(interaction, err);
          });
        }

        let playerStat = GuildDB.playerstats.find(stat => stat.discordID == args[0].options[0].value );
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription(`**Not Found** <@${args[0].options[0].value}> has no gamertag linked.`)] });

        const warnGTOverwrite = new EmbedBuilder()
          .setColor(client.config.Colors.Yellow)
          .setDescription(`**Notice:**\n> This action will unlink the gamertag \` ${playerStat.gamertag} \` from the user <@${playerStat.discordID}>. Are you sure you would like to continue?`)
        
        const opt = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`AdminUnlinkGamertag-yes-${args[0].options[0].value}-${interaction.member.user.id}`)
              .setLabel("Yes")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`AdminUnlinkGamertag-no-${args[0].options[0].value}-${interaction.member.user.id}`)
              .setLabel("No")
              .setStyle(ButtonStyle.Secondary)
          )

        return interaction.send({ embeds: [warnGTOverwrite], components: [opt] });

      } else if (args[0].name == 'claim-armband') {

        // Handle invalid roles
        if (GuildDB.excludedRoles.includes(args[0].options[0].value)) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Notice:**\n> This role has been configured to be excluded to claim an armband.')], flags: (1 << 6) });

        // If this faction has an existing record in the db
        if (GuildDB.factionArmbands[args[0].value]) {
          const warnArmbadChange = new EmbedBuilder()
            .setColor(client.config.Colors.Yellow)
            .setDescription(`**Notice:**\n> The faction <@&${args[0].options[0].value}> already has an armband selected. Are you sure you would like to change this?`)
          
          const opt = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`ChangeArmband-yes-${args[0].options[0].value}-${interaction.member.user.id}`)
                .setLabel("Yes")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`ChangeArmband-no-${args[0].options[0].value}-${interaction.member.user.id}`)
                .setLabel("No")
                .setStyle(ButtonStyle.Secondary)
            )

          return interaction.send({ embeds: [warnArmbadChange], components: [opt] });
        }

        // Any interaction for 'claim-armband' can be handled in 
        // 'commands/claim.js' Interaction handlers and does not require its own code in this file.

        let available = new StringSelectMenuBuilder()
          .setCustomId(`Claim-${args[0].options[0].value}-1-${interaction.member.user.id}`)
          .setPlaceholder('Select an armband from list 1 to claim')
        
        let availableNext = new StringSelectMenuBuilder()
          .setCustomId(`Claim-${args[0].options[0].value}-2-${interaction.member.user.id}`)
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

      } else if (args[0].name == 'bounty-clear') {

        let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].options[0].value);
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least ` 5 minutes `.')] });
        let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);

        playerStat.bounties = [];
        GuildDB.playerstats[playerStatIndex] = playerStat;

        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            'server.playerstats': GuildDB.playerstats,
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });        

        const clearedBounty = new EmbedBuilder()
          .setColor(client.config.Colors.Green)
          .setDescription(`Successfully cleared **${playerStat.gamertag}'s** bounties`);

        return interaction.send({ embeds: [clearedBounty] });

      } else if (args[0].name == 'ban-player') {

        BanPlayer(client, args[0].options[0].value);

        let banned = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully **banned** **${args[0].options[0].value}** from the DayZ Server`);

        return interaction.send({ embeds: [banned] });

      } else if (args[0].name == 'unban-player') {

        UnbanPlayer(client, args[0].options[0].value);

        let banned = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`Successfully **unbanned** **${args[0].options[0].value}** from the DayZ Server`);

        return interaction.send({ embeds: [banned] });

      } else if (args[0].name == 'add-money' || args[0].name == 'remove-money') {

        const targetUserID = args[0].options[1].value;
        let banking = await client.dbo.collection("users").findOne({"user.userID": targetUserID}).then(banking => banking);

        if (!banking) {
          banking = {
            userID: targetUserID,
            guilds: {
              [GuildDB.serverID]: {
                balance: GuildDB.startingBalance,
              }
            }
          }

          // Register bank for user  
          let newBank = new User();
          newBank.createUser(targetUserID, GuildDB.serverID, GuildDB.startingBalance);
          newBank.save().catch(err => {
            if (err) return client.sendInternalError(interaction, err);
          });
          
        } else banking = banking.user;

        if (!client.exists(banking.guilds[GuildDB.serverID])) {
          const success = addUser(banking.guilds, GuildDB.serverID, targetUserID, client, GuildDB.startingBalance);
          if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
        }

        let newBalance = args[0].name == 'add-money'
                          ? banking.guilds[GuildDB.serverID].balance + args[0].options[0].value
                          : banking.guilds[GuildDB.serverID].balance - args[0].options[0].value;
      
        client.dbo.collection("users").updateOne({"user.userID":targetUserID},{$set:{[`user.guilds.${GuildDB.serverID}.balance`]:newBalance}}, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });
      
        const successEmbed = new EmbedBuilder()
          .setDescription(`Successfully ${args[0].name == 'add-money' ? 'added' : 'removed'} **$${args[0].options[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}** ${args[0].name == 'add' ? 'to' : 'from'} <@${targetUserID}>'s balance`)
          .setColor(client.config.Colors.Green);

        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == "restart") {
        RestartServer(client);
        return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('The server will restart shortly.')], flags: (1 << 6) });
      }
    }
  },

  Interactions: {

    AdminOverwriteGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == interaction.customId.split('-')[3]);

          playerStat.discordID = interaction.customId.split('-')[2];
          
          let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
          GuildDB.playerstats[playerStatIndex] = playerStat;

          client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
            $set: {
              'server.playerstats': GuildDB.playerstats,
            }
          });

          let member = interaction.guild.members.cache.get(interaction.member.user.id);
          if (client.exists(GuildDB.linkedGamertagRole)) {
            let role = interaction.guild.roles.cache.get(GuildDB.linkedGamertagRole);
            member.roles.add(role);
          }

          if (client.exists(GuildDB.memberRole)) {
            let role = interaction.guild.roles.cache.get(GuildDB.memberRole);
            member.roles.add(role);
          }

          let connectedEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`Successfully connected \` ${playerStat.gamertag} \` as <@${interaction.customId.split('-')[2]}>'s gamertag.`);

          return interaction.update({ embeds: [connectedEmbed], components: [] });

        } else {
          const cancel = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription('**Canceled**\n> The gamertag link will not be overwritten');

          return interaction.update({ embeds: [cancel], components: [] });
        }
      }
    },

    AdminUnlinkGamertag: {
      run: async(client, interaction, GuildDB) => {
        if (!interaction.customId.endsWith(interaction.member.user.id)) 
          return interaction.reply({ content: 'This interaction is not for you', flags: (1 << 6) });

        if (interaction.customId.split('-')[1]=='yes') {
          let playerStat = GuildDB.playerstats.find(stat => stat.discordID == interaction.customId.split('-')[2]);

          playerStat.discordID = "";
          
          let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);
          GuildDB.playerstats[playerStatIndex] = playerStat;

          client.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, {
            $set: {
              'server.playerstats': GuildDB.playerstats,
            }
          });

          let connectedEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`Successfully unlinked \` ${playerStat.gamertag} \` from <@${interaction.customId.split('-')[2]}>.`);

          return interaction.update({ embeds: [connectedEmbed], components: [] });

        } else {
          const cancel = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription('**Canceled**\n> The gamertag unlink will not processed.');

          return interaction.update({ embeds: [cancel], components: [] });
        }
      }
    }

  }
}