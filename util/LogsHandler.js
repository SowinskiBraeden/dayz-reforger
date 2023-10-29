const { EmbedBuilder } = require('discord.js');
const { HandleAlarmsAndUAVs } = require('./AlarmsHandler');
const { SendConnectionLogs, DetectCombatLog } = require('./AdminLogsHandler');
const { getDefaultPlayer } = require('../database/player');
const { FetchServerSettings } = require('../util/NitradoAPI');
const { UpdatePlayer } = require('../database/player')

let lastSendMessage;

module.exports = {

  HandlePlayerLogs: async (client, GuildDB, line, combatLogTimer = 5) => {

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
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, client.config.Nitrado.ServerID);
      const newDt = await client.getDateEST(info.time);

      playerStat.lastConnectionDate = newDt;
      playerStat.connected = true;
      playerStat.connections++;

      // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
      if (client.playerSessions.has(info.playerID)) {
        // Player is already in a session, update the session's end time.
        const session = client.playerSessions.get(info.playerID);
        session.endTime = newDt; // Update end time.
      } else {
        // Player is not in a session, create a new session.
        const newSession = {
          startTime: newDt,
          endTime: null, // Initialize end time as null.
        };
        client.playerSessions.set(info.playerID, newSession);
      }

      await SendConnectionLogs(client, GuildDB, {
        time: info.time,
        player: info.player,
        connected: true,
        lastConnectionDate: null,
      });

      return await UpdatePlayer(client, playerStat);
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
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, client.config.Nitrado.ServerID);

      const newDt = await client.getDateEST(info.time);
      const unixTime = Math.round(newDt.getTime() / 1000); // Seconds
      const oldUnixTime = Math.round(playerStat.lastConnectionDate.getTime() / 1000); // Seconds
      const sessionTimeSeconds = unixTime - oldUnixTime;
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

      return await UpdatePlayer(client, playerStat);
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
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, client.config.Nitrado.ServerID);
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

      return await UpdatePlayer(client, playerStat)
    }

    if (line.includes('hit by Player')) {
      const data = line.includes('(DEAD)') ? [...line.matchAll(deadTemplate)][0] : [...line.matchAll(damageTemplate)][0];
      if (!data) return;

      const info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        attacker: data[6],
        attackerID: data[7]
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return;

      let playerStat = await client.dbo.collection("players").findOne({"playerID": info.playerID});
      if (!client.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, client.config.Nitrado.ServerID);

      playerStat.lastDamageDate = await client.getDateEST(info.time);
      playerStat.lastHitBy = info.attacker;

      return await UpdatePlayer(client, playerStat);
    }

    return;
  },

  HandleActivePlayersList: async (client, guild) => {
    client.activePlayersTick = 0; // reset hour tick

    const data = await FetchServerSettings(client, 'HandleActivePlayersList');  // Fetch server status

    if (data && data !== 1) {
      let hostname = data.data.gameserver.settings.config.hostname;
      let map = data.data.gameserver.settings.config.mission.slice(12);
      let status = data.data.gameserver.status;
      let slots = data.data.gameserver.slots;
      let playersOnline = data.data.gameserver.query.player_current;

      let statusEmoji;
      let statusText;
      if (status === "started") {
        statusEmoji = "🟢";
        statusText = "Active";
      } else if (status === "stopped") {
        statusEmoji = "🔴";
        statusText = "Stopped";
      } else if (status === "restarting") {
        statusEmoji = "↻";
        statusText = "Restarting";
      } else {
        statusEmoji = "❓"; // Unknown status
        statusText = "Unknown Status";
      }

      if (!client.exists(guild.activePlayersChannel)) return;

      const channel = client.GetChannel(guild.activePlayersChannel);
      let activePlayers = await client.dbo.collection("players").find({"connected": true}).toArray();

      let des = ``;
      for (let i = 0; i < activePlayers.length; i++) {
        des += `**- ${activePlayers[i].gamertag}**\n`;
      }
      const nodes = activePlayers.length === 0;
      const PlayersEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTitle(`Online List  \` ${playersOnline === undefined ? activePlayers.length : playersOnline} \`  Player${playersOnline !== 1 ? 's' : ''} Online`)
        .addFields(
          { name: 'Server:', value: `\` ${hostname} \``, inline: false },
          { name: 'Map:', value: `\` ${map} \``, inline: true },
          { name: 'Status:', value: `\` ${statusEmoji} ${statusText} \``, inline: true },
          { name: 'Slots:', value: `\` ${slots} \``, inline: true }
        );

      const activePlayersEmbed = new EmbedBuilder()
        .setColor(client.config.Colors.Default)
        .setTimestamp()
        .setTitle(`Players Online:`)
        .setDescription(des || (nodes ? "No Players Online :(" : ""));

      if (lastSendMessage) lastSendMessage.delete().catch(error => client.sendError(channel, `HandleActivePlayersList Error: \n${error}`));  // Remove previous message before reprinting

      return channel.send({ embeds: [PlayersEmbed, activePlayersEmbed] }).then(sentMessage =>
        lastSendMessage = sentMessage
      );
    }
  }
};
