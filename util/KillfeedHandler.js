const { EmbedBuilder } = require('discord.js');
const { User, addUser } = require('../structures/user');
const { KillInAlarm } = require('./AlarmsHandler');
const { destinations } = require('../config/destinations');
const { calculateVector } = require('./vector');

const Templates = {
  Killed: 1,
  HitBy: 2,
  HitByAndDead: 3,
  Explosion: 4,
  LandMine: 5,
  Melee: 6,
  Vehicle: 7,
};

module.exports = {
  
  HandleKillfeed: async (client, guildId, stats, line) => {
    
    let guild = await client.GetGuild(guildId);
    const channel = client.GetChannel(guild.killfeedChannel);

    let templateKilled     = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) with (.*) from (.*) meters /g;
    let template           = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    let templateDEAD       = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    let explosionTemplate  = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by  with (.*)/g;
    let landMineTemplate   = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by LandMineTrap/g;
    let meleeTemplate      = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*)/g;
    let vehicleTemplate    = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by (.*) with TransportHit/g;

    let killedBy = line.includes('hit by Player') && line.includes('(DEAD)') && line.includes('meters') ? Templates.HitByAndDead :
                   line.includes('hit by Player') && !line.includes('meters') ? Templates.Melee : // Missing meters indicates it was a melee attack.
                   line.includes('hit by Player') ? Templates.HitBy :
                   line.includes('killed by Player') ? Templates.Killed : 
                   line.includes('TransportHit') ? Templates.Vehicle : 
                   line.includes('killed by LandMineTrap') ? Templates.LandMine : Templates.Explosion;

    let data = killedBy == Templates.HitByAndDead ? [...line.matchAll(templateDEAD)][0] : 
               killedBy == Templates.HitBy ? [...line.matchAll(template)][0] :
               killedBy == Templates.Killed ? [...line.matchAll(templateKilled)][0] :
               killedBy == Templates.LandMine ? [...line.matchAll(landMineTemplate)][0] :
               killedBy == Templates.Melee ? [...line.matchAll(meleeTemplate)][0] :
               killedBy == Templates.Vehicle ? [...line.matchAll(vehicleTemplate)][0] :
               [...line.matchAll(explosionTemplate)][0];

    if (!data) return stats;
    
    // Create base data
    let info = {
      time:      data[1],
      victim:    data[2],
      victimID:  data[3],
      victimPOS: data[4].split(', ').map(v => parseFloat(v)),
    };

    // Add additional data
    if (killedBy == Templates.HitBy || killedBy == Templates.HitByAndDead || killedBy == Templates.Melee) {
      info.killer    = data[6];
      info.killerID  = data[7];
      info.killerPOS = data[8].split(', ').map(v => parseFloat(v));
      info.bodyPart  = data[9];
      info.damage    = data[10];
      info.weapon    = data[12];
      info.distance  = killedBy == Templates.Melee ? 0 : data[13];
    } else if (killedBy == Templates.Killed) {
      info.killer    = data[5];
      info.killerID  = data[6];
      info.killerPOS = data[7].split(', ').map(v => parseFloat(v));
      info.weapon    = data[8];
      info.distance  = data[9];
    }
    else if (killedBy == Templates.Vehicle) info.causeOfDeath = data[6];
    else if (killedBy == Templates.Explosion) info.causeOfDeath = data[5];
    else return stats; // Unknown template;

    const newDt = await client.getDateEST(info.time);
    const unixTime = Math.floor(newDt.getTime()/1000);

    const showCoords = client.exists(guild.showKillfeedCoords) ? guild.showKillfeedCoords : false; // default to false if no record of configuration.
    let tempDest;
    let lastDist = 1000000;
    let destination_dir;
    for (let i = 0; i < destinations.length; i++) {
      let { distance, theta, dir } = calculateVector(info.victimPOS, destinations[i].coord);
      if (distance < lastDist) {
        tempDest = destinations[i].name;
        lastDist = distance;
        destination_dir = dir;
      }
    }

    const destination = lastDist > 500 ? `${destination_dir} of ${tempDest}` : tempDest;

    if (killedBy == Templates.LandMine || killedBy == Templates.Explosion || killedBy == Templates.Vehicle) {
      const cod = killedBy == Templates.LandMine ? `Land Mine Trap` : info.causeOfDeath;
      const coord = showCoords ? `\n***Location [${info.victimPOS[0]}, ${info.victimPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${info.victimPOS[0]};${info.victimPOS[1]})***\nNear ${destination}` : '';
      const killMessage = killedBy == Templates.Vehicle ? 'run over by' : 'blew up from';

      const killEvent = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Death Event** - <t:${unixTime}>\n**${info.victim}** ${killMessage} a **${cod}.**${coord}`);

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
    victimStat.worstDeathStreak = victimStat.deathStreak > victimStat.worstDeathStreak ? victimStat.deathStreak : victimStat.worstDeathStreak;
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
          if (err) return client.sendError(client.GetChannel(guild.killfeedChannel), err);
        });
        
      } else banking = banking.user;

      if (!client.exists(banking.guilds[guildId])) {
        const success = addUser(banking.guilds, guildId, killer.discordID, this, guild.startingBalance);
        if (!success) return client.sendError(client.GetChannel(guild.killfeedChannel), 'Automatic Bounty Payout: Failed to add bank to database.');
      }

      const newBalance = banking.guilds[guildId].balance + totalBounty;
      
      await client.dbo.collection("users").updateOne({ "user.userID": killerStat.discordID }, {
        $set: {
          [`user.guilds.${guildId}.balance`]: newBalance,
        }
      }, (err, res) => {
        if (err) return client.sendError(client.GetChannel(guild.killfeedChannel), `Killfeed Error: Updating killer bank balance\n${err}`);
      });        

      receivedBounty = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`<@${killerStat.discordID}> received **$${totalBounty.toFixed(2).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}** in bounty rewards.`);

      victimStat.bounties = []; // clear bounties after claimed
    }

    if (killerStatIndex == -1) stats.push(killerStat);
    else stats[killerStatIndex] = killerStat;
    if (victimStatIndex == -1) stats.push(victimStat);
    else stats[victimStatIndex] = victimStat;
    
    const coord = showCoords ? `\n***Location [${info.victimPOS[0]}, ${info.victimPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${info.victimPOS[0]};${info.victimPOS[1]})***\nNear ${destination}` : '';
    
    const killEvent = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setDescription(`**Kill Event** - <t:${unixTime}>\n**${info.killer}** killed **${info.victim}**\n> **__Kill Data__**\n> **Weapon:** \` ${info.weapon} \`\n> **Distance:** \` ${info.distance} \`\n> **Body Part:** \` ${info.bodyPart != undefined ? info.bodyPart.split('(')[0] : 'N/A'} \`\n> **Damage:** \` ${info.damage != undefined ? info.damage : 'N/A'} \`\n **Killer\n${killerStat.KDR.toFixed(2)} K/D - ${killerStat.kills} Kill${(killerStat.kills == 0 || killerStat.kills > 1) ? 's':''} - Killstreak: ${killerStat.killStreak}\nVictim\n${victimStat.KDR.toFixed(2)} K/D - ${victimStat.deaths} Death${victimStat.deaths>1?'s':''} - Deathstreak: ${victimStat.deathStreak}**${coord}`);

    if (client.exists(channel)) await channel.send({ embeds: [killEvent] });
    if (client.exists(receivedBounty) && client.exists(channel)) await channel.send({ content: `<@${killerStat.discordID}>`, embeds: [receivedBounty] });
    
    return stats;
  }
}