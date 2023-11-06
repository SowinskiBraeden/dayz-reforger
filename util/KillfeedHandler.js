const { EmbedBuilder } = require('discord.js');
const { createUser, addUser } = require('../database/user');
const { KillInAlarm } = require('./AlarmsHandler');
const { destinations } = require('../database/destinations');
const { calculateVector } = require('./vector');
const { getDefaultPlayer, UpdatePlayer } = require('../database/player');
const { calculateNewCombatRating } = require('./combatRatingHandler');

const Templates = {
  Killed:       1,
  HitBy:        2,
  HitByAndDead: 3,
  Explosion:    4,
  LandMine:     5,
  Melee:        6,
  Vehicle:      7,
};

const Vehicles = {
  CivilianSedan:           'White Olga',
  CivilianSedan_Black:     'Black Olga',
  CivilianSedan_Wine:      'Wine Olga',
  
  Hatchback_02:            'Red Gunter',
  Hatchback_02_Black:      'Black Gunter',
  Hatchback_02_Blue:       'Blue Gunter',

  OffroadHatchBack:        'Green ADA 4x4',
  OffroadHatchBack_Blue:   'Blue ADA 4x4',
  OffroadHatchBack_White:  'White ADA 4x4', 
  
  Sedan_02:                'Yellow Sarka',
  Sedan_02_Grey:           'Grey Sarka',
  Sedan_02_Red:            'Red Sarka',
  
  Truck_01_Covered:        'Green V3S Truck',
  Truck_01_Covered_Blue:   'Blue V3S Truck',
  Truck_01_Covered_Orange: 'Orange V3S Truck',

  Offroad_02:              'M1025 Humvee'
};

module.exports = {
  
  // Update last death date for non PVP deaths
  UpdateLastDeathDate: async (client, line) => {
    let killedByZmb  = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) killed by (.*)/g;
    let diedTemplate = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\) died\. Stats> Water: (.*) Energy: (.*) Bleed sources: (.*)/g;
  
    let data = line.includes('>) died.') ? [...line.matchAll(diedTemplate)][0] : [...line.matchAll(killedByZmb)][0];
    if (!data) return;

    let info = {
      time:      data[1],
      victim:    data[2],
      victimID:  data[3],
      victimPOS: data[4].split(', ').map(v => parseFloat(v)),
    };

    const newDt = await client.getDateEST(info.time);

    let victimStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
    if (!client.exists(victimStat)) victimStat = getDefaultPlayer(info.player, info.playerID, client.config.Nitrado.ServerID);

    victimStat.lastDeathDate = newDt;

    await UpdatePlayer(client, victimStat);
    return
  },

  HandleKillfeed: async (client, guild, line) => {
    
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

    if (!data) return;
    
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
      info.distance  = killedBy == Templates.Melee ? 0 : parseFloat(data[13]).toFixed(2);
    } else if (killedBy == Templates.Killed) {
      info.killer    = data[5];
      info.killerID  = data[6];
      info.killerPOS = data[7].split(', ').map(v => parseFloat(v));
      info.weapon    = data[8];
      info.distance  = parseFloat(data[9]).toFixed(2);
    }
    else if (killedBy == Templates.Vehicle) info.causeOfDeath = data[6];
    else if (killedBy == Templates.Explosion) info.causeOfDeath = data[5];
    else return; // Unknown template;

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

    const destination = lastDist > 500 ? `${destination_dir} of ${tempDest}` : `Near ${tempDest}`;

    if (killedBy == Templates.LandMine || killedBy == Templates.Explosion || killedBy == Templates.Vehicle) {
      let victimStat = await client.dbo.collection("players").findOne({"playerID": info.victimID});
      if (!client.exists(victimStat)) victimStat = getDefaultPlayer(info.victim, info.victimID, client.config.Nitrado.ServerID);
      victimStat.lastDeathDate = newDt;

      const cod = killedBy == Templates.LandMine ? `Land Mine Trap` : 
                  killedBy == Templates.Vehicle ? Vehicles[info.causeOfDeath] : info.causeOfDeath;
      const coord = showCoords ? `\n***Location [${info.victimPOS[0]}, ${info.victimPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${info.victimPOS[0]};${info.victimPOS[1]})***\n${destination}` : '';
      const killMessage = killedBy == Templates.Vehicle ? 'run over by' : 'blew up from';

      const killEvent = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`**Death Event** - <t:${unixTime}>\n**${info.victim}** ${killMessage} a **${cod}.**${coord}`);

      if (client.exists(channel)) await channel.send({ embeds: [killEvent] });
      await UpdatePlayer(client, victimStat);
      return
    }

    KillInAlarm(client, guild.serverID, info); // check if kill happened in a no kill zone

    if (!client.exists(info.victim) || !client.exists(info.victimID) || !client.exists(info.killer) || !client.exists(info.killerID)) return;

    let victimStat = await client.dbo.collection("players").findOne({"playerID": info.victimID});
    let killerStat = await client.dbo.collection("players").findOne({"playerID": info.killerID});
    if (!client.exists(victimStat)) victimStat = getDefaultPlayer(info.victim, info.victimID, client.config.Nitrado.ServerID);
    if (!client.exists(killerStat)) killerStat = getDefaultPlayer(info.killer, info.killerID, client.config.Nitrado.ServerID);
    
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
    if (!client.exists(killerStat.combatRating)) killerStat.combatRating = 800;
    if (!client.exists(victimStat.combatRating)) victimStat.combatRating = 800;
    if (!client.exists(killerStat.combatRatingHistory)) killerStat.combatRatingHistory = [800];
    if (!client.exists(victimStat.combatRatingHistory)) victimStat.combatRatingHistory = [800];
    let killerOldRating = killerStat.combatRating;
    let victimOldRating = victimStat.combatRating;
    killerStat.combatRating = calculateNewCombatRating(killerStat.combatRating, victimStat.combatRating, client.exists(info.bodyPart) && info.bodyPart.includes('Head') ? 1.25 : 1);
    victimStat.combatRating = calculateNewCombatRating(victimStat.combatRating, killerStat.combatRating, 0);
    if (killerStat.combatRatingHistory.length == 8) killerStat.combatRatingHistory = killerStat.combatRatingHistory.slice(1); // Remove first element (limits history to length 8)
    if (victimStat.combatRatingHistory.length == 8) victimStat.combatRatingHistory = victimStat.combatRatingHistory.slice(1); // Remove first element (limits history to length 8)
    killerStat.combatRatingHistory.push(killerStat.combatRating);
    victimStat.combatRatingHistory.push(victimStat.combatRating);
    let kdiff = killerStat.combatRating - killerOldRating;
    let vdiff = victimStat.combatRating - victimOldRating;

    let receivedBounty = null;
    if (victimStat.bounties.length > 0 && killerStat.discordID != "") {
      let totalBounty = 0;
      for (let i = 0; i < victimStat.bounties.length; i++) {
        totalBounty += victimStat.bounties[i].value;
      }

      let banking = await client.dbo.collection("users").findOne({"user.userID": killerStat.discordID}).then(banking => banking);
      
      if (!banking) {
        banking = await createUser(interaction.member.user.id, guild.serverID, guild.startingBalance, client)
        if (!client.exists(banking)) return client.sendInternalError(interaction, err);
      }
      banking = banking.user;

      if (!client.exists(banking.guilds[ guild.serverID])) {
        const success = addUser(banking.guilds,  guild.serverID, interaction.member.user.id, client, guild.startingBalance);
        if (!success) return client.sendInternalError(interaction, 'Failed to add bank');
      }

      const newBalance = banking.guilds[ guild.serverID].balance + totalBounty;
      
      await client.dbo.collection("users").updateOne({ "user.userID": killerStat.discordID }, {
        $set: {
          [`user.guilds.${ guild.serverID}.balance`]: newBalance,
        }
      }, (err, res) => {
        if (err) return client.sendError(client.GetChannel(guild.killfeedChannel), `Killfeed Error: Updating killer bank balance\n${err}`);
      });        

      receivedBounty = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setDescription(`<@${killerStat.discordID}> received **$${totalBounty.toFixed(2).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}** in bounty rewards.`);

      victimStat.bounties = []; // clear bounties after claimed
      victimStat.bountiesLength = 0;
    }

    await UpdatePlayer(client, victimStat);
    await UpdatePlayer(client, killerStat);
    
    const header = `**Kill Event** - <t:${unixTime}>\n**${info.killer}** killed **${info.victim}**`;
    const killData = `\n> **__Kill Data__**\n> Weapon:    \` ${info.weapon} \`\n> Distance:  \` ${info.distance}m \`\n> Body Part: \` ${info.bodyPart != undefined ? info.bodyPart.split('(')[0] : 'N/A'} \`\n> Damage:    \` ${info.damage != undefined ? info.damage : 'N/A'} \``;
    const killerStatsView = `\n**Killer Rating** (${kdiff >= 0 ? '+' : ''}${kdiff}) ${killerStat.combatRating}\n${killerStat.KDR.toFixed(2)} K/D - ${killerStat.kills} Kill${(killerStat.kills == 0 || killerStat.kills > 1) ? 's':''} - Killstreak: ${killerStat.killStreak}`;
    const victimStatsView = `\n**Victim Rating** (${vdiff >= 0 ? '+' : ''}${vdiff}) ${victimStat.combatRating}\n${victimStat.KDR.toFixed(2)} K/D - ${victimStat.deaths} Death${victimStat.deaths == 0 || victimStat.deaths>1?'s':''} - Deathstreak: ${victimStat.deathStreak}`;
    const coord = showCoords ? `\n***Location [${info.victimPOS[0]}, ${info.victimPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${info.victimPOS[0]};${info.victimPOS[1]})***\n${destination}` : '';

    const killEvent = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setDescription(`${header}${killData}${killerStatsView}${victimStatsView}${coord}`);

    if (client.exists(channel)) await channel.send({ embeds: [killEvent] });
    if (client.exists(receivedBounty) && client.exists(channel)) await channel.send({ content: `<@${killerStat.discordID}>`, embeds: [receivedBounty] });
    
    return;
  }
}