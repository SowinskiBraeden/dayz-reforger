const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "bounty",
  debug: false,
  global: false,
  description: "Set or view bounties",
  usage: "[cmd] [opt]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [{
    name: "set",
    description: "Set a bounty on a player",
    value: "set",
    type: 1,
    options: [{
      name: "gamertag",
      description: "Gamertag of player for bounty",
      value: "gamertag",
      type: 3,
      required: true,
    }, {
      name: "value",
      description: "Amount of the bounty",
      value: "value",
      type: 10,
      min_value: 0.01,
      required: true
    }, {
      name: "anonymous",
      description: "Make this bounty anonymous",
      value: false,
      type: 5,
      required: false
    }]
  }, {
    name: "view",
    description: "View all active bounties",
    value: "view",
    type: 1,
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

      if (args[0].name == 'set') {

        let playerStat = GuildDB.playerstats.find(stat => stat.gamertag == args[0].options[0].value);
        if (playerStat == undefined) return interaction.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Yellow).setDescription('**Not Found** This player cannot be found, the gamertag may be incorrect or this player has not logged onto the server before for at least ` 5 minutes `.')] });
        let playerStatIndex = GuildDB.playerstats.indexOf(playerStat);

        let banking = await client.dbo.collection("users").findOne({"user.userID": interaction.member.user.id}).then(banking => banking);

        if (!banking) {
          banking = {
            userID: interaction.member.user.id,
            guilds: {
              [GuildDB.serverID]: {
                balance: GuildDB.startingBalance,
              }
            }
          }

          // Register bank for user  
          let newBank = new User();
          newBank.createUser(interaction.member.user.id, GuildDB.serverID, GuildDB.startingBalance);
          newBank.save().catch(err => {
            if (err) return client.sendInternalError(interaction, err);
          });
          
        } else banking = banking.user;

        if (!client.exists(banking.guilds[GuildDB.serverID])) {
          const success = addUser(banking.guilds, GuildDB.serverID, interaction.member.user.id, client, GuildDB.startingBalance);
          if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
        }

        if (args[0].options[1].value > banking.guilds[GuildDB.serverID].balance) {
          let nsf = new EmbedBuilder()
            .setDescription('**Bank Notice:** NSF. Non sufficient funds')
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [nsf] });
        }

        const newBalance = banking.guilds[GuildDB.serverID].balance - args[0].options[1].value;
      
        client.dbo.collection("users").updateOne({ "user.userID": interaction.member.user.id }, {
          $set: {
            [`user.guilds.${GuildDB.serverID}.balance`]: newBalance,
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });

        let anonymous = args[0].options[2];

        playerStat.bounties.push({
          setBy: (anonymous && !anonymous.value) ? interaction.member.user.id : null,
          value: args[0].options[1].value,
        });

        GuildDB.playerstats[playerStatIndex] = playerStat;

        client.dbo.collection("guilds").updateOne({ "server.serverID": GuildDB.serverID }, {
          $set: {
            'server.playerstats': GuildDB.playerstats,
          }
        }, function(err, res) {
          if (err) return client.sendInternalError(interaction, err);
        });        
        
        const successEmbed = new EmbedBuilder()
          .setTitle('Success')
          .setDescription(`Successfully set a **$${args[0].options[1].value.toFixed(2)}** bounty on \` ${playerStat.gamertag} \`\nThis can be viewed using </bounty view:1086786904671924267>`)
          .setColor(client.config.Colors.Green);
        
        if (anonymous && anonymous.value) return interaction.send({ embeds: [successEmbed], flags: (1 << 6) });
        return interaction.send({ embeds: [successEmbed] });

      } else if (args[0].name == 'view') {

        let activeBounties = GuildDB.playerstats.filter((p) => p.bounties.length > 0);

        let bountiesEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription('**Active Boutnies**');

        for (let i = 0; i < activeBounties.length; i++) {
          for (let j = 0; j < activeBounties[i].bounties.length; j++) {
            bountiesEmbed.addFields({ name: `${activeBounties[i].gamertag} has a:`, value: `**$${activeBounties[i].bounties[j].value.toFixed(2)}** bounty set by ${activeBounties[i].bounties[j].setBy == null ? 'Anonymous' : `<@${activeBounties[i].bounties[j].setBy}>`}`, inline: false });
          }
        }

        return interaction.send({ embeds: [bountiesEmbed] });
      }
    },
  },
}