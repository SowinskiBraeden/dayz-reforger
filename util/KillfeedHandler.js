const { EmbedBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user');
const { KillInAlarm } = require('./AlarmsHandler');

module.exports = {
  
  HandleKillfeed: async (client, guildId, stats, line) => {
    
    let guild = await client.GetGuild(guildId);
    const channel = client.channels.cache.get(guild.killfeedChannel);

    let templateKilled     = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) with (.*) from (.*) meters /g;
    let template           = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    let templateDEAD       = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    let explosionTemplate  = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by  with (.*)/g;
    
    let killedBy = line.includes('hit by Player') && line.includes('(DEAD)') ? 1 :
                   line.includes('hit by Player') ? 2 :
                   line.includes('killed by Player') ? 3 : 4;

    let data = killedBy == 1 ? [...line.matchAll(templateDEAD)][0] : 
               killedBy == 2 ? [...line.matchAll(template)][0] :
               killedBy == 3 ? [...line.matchAll(templateKilled)][0] :
               [...line.matchAll(explosionTemplate)][0]

    if (!data) return stats;
    
    // Create base data
    let info = {
      time:      data[1],
      victim:    data[2],
      victimID:  data[3],
      victimPOS: data[4],
    }; 

    // Add additional data
    if (killedBy == 1 || killedBy == 2) {
      info.killer    = data[6];
      info.killerID  = data[7];
      info.killerPOS = data[8];
      info.bodyPart  = data[9];
      info.damage    = data[10];
      info.bullet    = data[11];
      info.weapon    = data[12];
      info.distance  = data[13];
    } else if (killedBy == 3) {
      info.killer    = data[5];
      info.killerID  = data[6];
      info.killerPOS = data[7];
      info.weapon    = data[8];
      info.distance  = data[9];
    } else info.causeOfDeath = data[5];

    let newDt = await client.getDateEST(info.time);
    let unixTime = Math.floor(newDt.getTime()/1000);

    if (!killedBy == 4) {
      const killEvent = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Death Event** - <t:${unixTime}>\n**${info.victim}** killed by a **${info.causeOfDeath}.**`);

      if (client.exists(channel)) await channel.send({ embeds: [killEvent] });
      return stats;
    }

    KillInAlarm(client, guildId, info); // check if kill happened in a no kill zone

    if (!client.exists(info.victim) || !client.exists(info.victimID) || !client.exists(info.killer) || !client.exists(info.killerID)) return stats;

    let killerStat = stats.find(stat => stat.playerID == info.killerID)
    let victimStat = stats.find(stat => stat.playerID == info.victimID)
    let killerStatIndex = stats.indexOf(killerStat);
    let victimStatIndex = stats.indexOf(victimStat);
    if (killerStat == undefined) killerStat = client.getDefaultPlayerStats(info.killer, info.killerID);
    if (victimStat == undefined) victimStat = client.getDefaultPlayerStats(info.victim, info.victimID);
    
    killerStat.kills++;
    killerStat.killStreak++;
    killerStat.bestKillStreak = killerStat.killStreak > killerStat.bestKillStreak ? killerStat.killStreak : killerStat.bestKillStreak;
    killerStat.longestKill = parseFloat(info.distance) > killerStat.longestKill ? parseFloat(info.distance).toFixed(1) : killerStat.longestKill;
    victimStat.deaths++;
    victimStat.deathStreak++;
    victimStat.worstDeathStreak = victimStat.deathStreak > victimStat.worstDeathStreak ? victimStat.deathStreak : victimStat.bestKillStreak;
    killerStat.KDR = killerStat.kills / (killerStat.deaths == 0 ? 1 : killerStat.deaths); // prevent division by 0
    victimStat.KDR = victimStat.kills / (victimStat.deaths == 0 ? 1 : victimStat.deaths); // prevent division by 0
    victimStat.killStreak = 0;
    victimStat.lastDeathDate = newDt;
    killerStat.deathStreak = 0;

    let receivedBounty = null;
    if (victimStat.bounties.length > 0 && killerStat.discordID != "") {
      let totalBounty = 0;
      for (let i = 0; i < victimStat.bounties.length; i++) {
        totalBounty += victimStat.bounties[i].value;
      }

      let banking = await client.dbo.collection("users").findOne({"user.userID": killerStat.discordID}).then(banking => banking);
      
      if (!banking) {
        banking = {
          userID: killerStat.discordID,
          guilds: {
            [guildId]: {
              balance: guild.startingBalance,
            }
          }
        }

        // Register bank for user  
        let newBank = new User();
        newBank.createUser(killerStat.discordID, guildId, guild.startingBalance);
        newBank.save().catch(err => {
          if (err) return client.sendInternalError(interaction, err);
        });
        
      } else banking = banking.user;

      if (!client.exists(banking.guilds[guildId])) {
        const success = addUser(banking.guilds, guildId, killer.discordID, this, guild.startingBalance);
        if (!success) return client.sendError(guild.connectionLogsChannel, 'Failed to add bank');
      }

      const newBalance = banking.guilds[guildId].balance + totalBounty;
      
      await client.dbo.collection("users").updateOne({ "user.userID": killerStat.discordID }, {
        $set: {
          [`user.guilds.${guildId}.balance`]: newBalance,
        }
      }, function(err, res) {
        if (err) return client.sendError(guild.connectionLogsChannel, err);
      });        

      receivedBounty = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`<@${killerStat.discordID}> received **$${totalBounty.toFixed(2)}** in bounty rewards.`);
    }

    if (killerStatIndex == -1) stats.push(killerStat);
    else stats[killerStatIndex] = killerStat;
    if (victimStatIndex == -1) stats.push(victimStat);
    else stats[victimStatIndex] = victimStat;
    
    const killEvent = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setDescription(`**Kill Event** - <t:${unixTime}>\n**${info.killer}** killed **${info.victim}**\n> **__Kill Data__**\n> **Weapon:** \` ${info.weapon} \`\n> **Distance:** \` ${info.distance} \`\n> **Body Part:** \` ${info.bodyPart != undefined ? info.bodyPart.split('(')[0] : 'N/A'} \`\n> **Damage:** \` ${info.damage != undefined ? info.damage : 'N/A'} \`\n **Killer\n${killerStat.KDR.toFixed(2)} K/D - ${killerStat.kills} Kills - Killstreak: ${killerStat.killStreak}\nVictim\n${victimStat.KDR.toFixed(2)} K/D - ${victimStat.deaths} Deaths - Deathstreak: ${victimStat.deathStreak}**`);

    if (client.exists(channel)) await channel.send({ embeds: [killEvent] });
    if (client.exists(receivedBounty) && client.exists(channel)) await channel.send({ content: `<@${killerStat.discordID}>`, embeds: [receivedBounty] });
    
    return stats;
  }
}