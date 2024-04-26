const { EmbedBuilder } = require('discord.js');
const { HandleAlarmsAndUAVs } = require('./AlarmsHandler');
const { SendConnectionLogs, DetectCombatLog } = require('./AdminLogsHandler');
const { getDefaultPlayer } = require('../database/player');
const { FetchServerSettings } = require('../util/NitradoAPI');
const { UpdatePlayer, insertPVPstats, createWeaponStats } = require('../database/player')
const { Missions } = require('../database/destinations');

let lastSendMessage;

module.exports = {

  HandlePlayerLogs: async (NitradoServerID, client, GuildDB, line, combatLogTimer = 5) => {

    const connectTemplate    = /(.*) \| Player \"(.*)\" is connected \(id=(.*)\)/g;
    const disconnectTemplate = /(.*) \| Player \"(.*)\"\(id=(.*)\) has been disconnected/g;
    const positionTemplate   = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
    const damageTemplate     = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    const deadTemplate       = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;

    if (line.includes(' connected')) {
      const data = [...line.matchAll(connectTemplate)][0];
      if (!data) return;

      const info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return;

      let playerStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, NitradoServerID);
      const newDt = await client.getDateEST(info.time);

      playerStat.lastConnectionDate = newDt;
      playerStat.connected = true;
      if (!client.exists(playerStat.connections)) playerStat.connections = 0;
      playerStat.connections++;
      
      // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
      if (client.playerSessions.get(NitradoServerID).has(info.playerID)) {
        // Player is already in a session, update the session's end time.
        const session = client.playerSessions.get(NitradoServerID).get(info.playerID);
        session.endTime = newDt; // Update end time.
      } else {
        // Player is not in a session, create a new session.
        const newSession = {
          startTime: newDt,
          endTime: null, // Initialize end time as null.
        };
        client.playerSessions.get(NitradoServerID).set(info.playerID, newSession);
      }

      await SendConnectionLogs(client, GuildDB, {
        time: info.time,
        player: info.player,
        connected: true,
        lastConnectionDate: null,
      });

      await UpdatePlayer(client, playerStat);
    }

    if (line.includes(' disconnected')) {
      const data = [...line.matchAll(disconnectTemplate)][0];
      if (!data) return;

      const info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return;

      let playerStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, NitradoServerID);
      
      let oldUnixTime;
      let sessionTimeSeconds;
      const newDt = await client.getDateEST(info.time);
      const unixTime = Math.round(newDt.getTime() / 1000); // Seconds
      if (playerStat.lastConnectionDate != null) {
        oldUnixTime = Math.round(playerStat.lastConnectionDate.getTime() / 1000); // Seconds
        sessionTimeSeconds = unixTime - oldUnixTime;
      } else sessionTimeSeconds = 0;
      if (!client.exists(playerStat.longestSessionTime)) playerStat.longestSessionTime = 0;

      playerStat.totalSessionTime = playerStat.totalSessionTime + sessionTimeSeconds;
      playerStat.lastSessionTime = sessionTimeSeconds;
      playerStat.longestSessionTime = sessionTimeSeconds > playerStat.longestSessionTime ? sessionTimeSeconds : playerStat.longestSessionTime;
      playerStat.lastDisconnectionDate = newDt;
      playerStat.connected = false;

      await SendConnectionLogs(client, GuildDB, {
        time: info.time,
        player: info.player,
        connected: false,
        lastConnectionDate: playerStat.lastConnectionDate,
      });

      if (combatLogTimer != 0) {
        await DetectCombatLog(client, GuildDB, {
          time: info.time,
          player: info.player,
          pos: playerStat.pos,
          lastDamageDate: playerStat.lastDamageDate,
          lastHitBy: playerStat.lastHitBy,
          lastDeathDate: playerStat.lastDeathDate,
          combatLogTimer: combatLogTimer,
        });
      }

      await UpdatePlayer(client, playerStat);
    }

    if (line.includes('pos=<') && !line.includes('hit by')) {
      const data = [...line.matchAll(positionTemplate)][0];
      if (!data) return;

      const info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        pos: data[4].split(', ').map(v => parseFloat(v))
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return;

      let playerStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, NitradoServerID);
      if (!client.exists(playerStat.lastConnectionDate)) playerStat.lastConnectionDate = await client.getDateEST(info.time);

      playerStat.lastPos = playerStat.pos;
      playerStat.pos = info.pos;
      playerStat.lastTime = playerStat.time;
      playerStat.lastDate = playerStat.date;
      playerStat.time = `${info.time} EST`;
      playerStat.date = await client.getDateEST(info.time);

      if (line.includes('hit by') || line.includes('killed by')) return; // prevent additional information from being fed to Alarms & UAVs

      await HandleAlarmsAndUAVs(client, GuildDB, {
        time: info.time,
        player: info.player,
        playerID: info.playerID,
        pos: info.pos,
      });

      await UpdatePlayer(client, playerStat)
    }

    if (line.includes('hit by Player')) {
      const data = line.includes('(DEAD)') ? [...line.matchAll(deadTemplate)][0] : [...line.matchAll(damageTemplate)][0];
      if (!data) return;

      const info = {
        time:       data[1],
        player:     data[2],
        playerID:   data[3],
        attacker:   data[6],
        attackerID: data[7],
        bodyPart:   data[9].split("(")[0],
        weapon:     data[12],
      };

      if (!client.exists(info.player) || !client.exists(info.playerID) || !client.exists(info.attacker) || !client.exists(info.attackerID)) return;

      let playerStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
      let attackerStat = await client.dbo.collection("players").findOne({"playerID": info.attackerID});
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, NitradoServerID);
      if (!client.exists(attackerStat)) attackerStat = getDefaultPlayer(info.attacker, info.attackerID, NitradoServerID);

      playerStat.lastDamageDate = await client.getDateEST(info.time);
      playerStat.lastHitBy = info.attacker;

      if (!client.exists(playerStat.shotsLanded)) playerStat = insertPVPstats(playerStat);
      if (!client.exists(attackerStat.shotsLanded)) attackerStat = insertPVPstats(attackerStat);

      // Update in depth PVP stats if non Melee weapon
      if (info.weapon.includes("Engraved")) info.weapon = info.weapon.split("Engraved ")[1];
      if (info.weapon.includes("Sawed-off")) info.weapon = info.weapon.split("Sawed-off ")[1];
      if (info.weapon in playerStat.weaponStats) {
        playerStat.timesShot++;
        playerStat.timesShotPerBodyPart[info.bodyPart]++;
        if (!client.exists(playerStat.weaponStats[info.weapon])) playerStat = createWeaponStats(playerStat, info.weapon);
        playerStat.weaponStats[info.weapon].timesShot++;
        playerStat.weaponStats[info.weapon].timesShotPerBodyPart[info.bodyPart]++;

        attackerStat.shotsLanded++;
        attackerStat.shotsLandedPerBodyPart[info.bodyPart]++;
        if (!client.exists(attackerStat.weaponStats[info.weapon])) attackerStat = createWeaponStats(attackerStat, info.weapon);
        attackerStat.weaponStats[info.weapon].shotsLanded++;
        attackerStat.weaponStats[info.weapon].shotsLandedPerBodyPart[info.bodyPart]++;
      }

      await UpdatePlayer(client, playerStat);
      await UpdatePlayer(client, attackerStat);
    }

    return;
  },

  HandleActivePlayersList: async (nitrado_cred, client, guild) => {
    client.activePlayersTick = 0; // reset hour tick

    if (!client.exists(guild.activePlayersChannel)) return;
    const channel = client.GetChannel(guild.activePlayersChannel);

    const data = await FetchServerSettings(nitrado_cred, client, 'HandleActivePlayersList');  // Fetch server status
    const e = data && data !== 1; // Check if data exists
    
    const hostname      = e ? data.data.gameserver.settings.config.hostname : 'N/A';
    const map           = Missions[data.data.gameserver.settings.config.mission];
    const status        = e ? data.data.gameserver.status : 'N/A';
    const slots         = e ? data.data.gameserver.slots : 'N/A';
    const playersOnline = e ? data.data.gameserver.query.player_current : undefined;

    const Statuses = {
      "started": {emoji: "🟢", text: "Active"},
      "stopped": {emoji: "🔴", text: "Stopped"},
      "restarting": {emoji: "↻", text: "Restarting"},
    };

    const emojiStatus = Statuses[status].emoji || "❓";
    const textStatus  = Statuses[status].text || "Unknown Status";

    let activePlayers = await client.dbo.collection("players").find({"connected": true}).toArray();

    let des = activePlayers.length > 0 ? `` : `**No Players Online**`;
    for (let i = 0; i < activePlayers.length; i++) {
      des += `**- ${activePlayers[i].gamertag}**\n`;
    }
    
    const nodes = activePlayers.length === 0;
    const serverEmbed = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setTitle(`Online List - \` ${playersOnline === undefined ? activePlayers.length : playersOnline} \`  Player${playersOnline !== 1 ? 's' : ''} Online`)
      .addFields(
        { name: 'Server:', value: `\` ${hostname} \``, inline: false },
        { name: 'Map:', value: `\` ${map} \``, inline: true },
        { name: 'Status:', value: `\` ${emojiStatus} ${textStatus} \``, inline: true },
        { name: 'Slots:', value: `\` ${slots} \``, inline: true }
      );

    const activePlayersEmbed = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setTimestamp()
      .setTitle(`Players Online:`)
      .setDescription(des || (nodes ? "No Players Online :(" : ""));

    if (lastSendMessage) lastSendMessage.delete().catch(error => client.sendError(channel, `HandleActivePlayersList Error: \n${error}`));  // Remove previous message before reprinting

    return channel.send({ embeds: [serverEmbed, activePlayersEmbed] }).then(sentMessage =>
      lastSendMessage = sentMessage
    );
  }
};
