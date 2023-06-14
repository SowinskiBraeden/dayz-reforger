const { EmbedBuilder } = require('discord.js');
const { HandleAlarmsAndUAVs } = require('./AlarmsHandler');
const { SendConnectionLogs, DetectCombatLog } = require('./AdminLogsHandler');

module.exports = {

  HandlePlayerLogs: async (client, guildId, stats, line) => {

    const connectTemplate    = /(.*) \| Player \"(.*)\" is connected \(id=(.*)\)/g;
    const disconnectTemplate = /(.*) \| Player \"(.*)\"\(id=(.*)\) has been disconnected/g;
    const positionTemplate   = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
    const damageTemplate     = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)\[HP\: (.*)\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    const deadTemplate       = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: 0] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;

    if (line.includes(' connected')) {
      let data = [...line.matchAll(connectTemplate)][0];
      if (!data) return stats;

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        connected: true,
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return stats;

      let playerStat = stats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = stats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = client.getDefaultPlayerStats(info.player, info.playerID);
      
      let newDt = await client.getDateEST(info.time);
      
      playerStat.lastConnectionDate = newDt;

      if (playerStatIndex == -1) stats.push(playerStat);
      else stats[playerStatIndex] = playerStat;

      SendConnectionLogs(client, guildId, {
        time: info.time,
        player: info.player,
        connected: info.connected,
        lastConnectionDate: null,
      });
    }

    if (line.includes(' disconnected')) {
      let data = [...line.matchAll(disconnectTemplate)][0];
      if (!data) return stats;

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        connected: false
      }

      if (!client.exists(info.player) || !client.exists(info.playerID)) return stats;

      let playerStat = stats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = stats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = client.getDefaultPlayerStats(info.player, info.playerID);
      if (!client.exists(playerStat.totalSessionTime)) playerStat.totalSessionTime = 0;

      let newDt = await client.getDateEST(info.time);
      let unixTime = Math.floor(newDt.getTime()/1000);
      if (!client.exists(playerStat.lastConnectionDate)) playerStat.lastConnectionDate = await client.getDateEST(info.time);
      let oldUnixTime = Math.floor(playerStat.lastConnectionDate.getTime()/1000);
      let seconds = unixTime - oldUnixTime;
      let sessionTime = client.secondsToDhms(seconds);

      playerStat.totalSessionTime = playerStat.totalSessionTime + seconds;
      playerStat.lastSessionTime = sessionTime;

      if (playerStatIndex == -1) stats.push(playerStat);
      else stats[playerStatIndex] = playerStat;

      SendConnectionLogs(client, guildId, {
        time: info.time,
        player: info.player,
        connected: info.connected,
        lastConnectionDate: playerStat.lastConnectionDate,
      });

      DetectCombatLog(client, guildId, {
        time: info.time,
        player: info.player,
        lastDamageDate: playerStat.lastDamageDate,
        lastHitBy: playerStat.lastHitBy,
        lastDeathDate: playerStat.lastDeathDate,
      });
    }

    if (line.includes('pos=<')) {
      let data = [...line.matchAll(positionTemplate)][0];
      if (!data) return stats;

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        pos: data[4].split(', ').map(v => parseFloat(v))
      };

      if (!client.exists(info.player) || !client.exists(info.playerID)) return stats;

      let playerStat = stats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = stats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = client.getDefaultPlayerStats(info.player, info.playerID);
      if (!client.exists(playerStat.lastConnectionDate)) playerStat.lastConnectionDate = await client.getDateEST(info.time);
      
      playerStat.lastPos = playerStat.pos;
      playerStat.pos = info.pos;
      playerStat.lastTime = playerStat.time;
      playerStat.time = `${info.time} EST`;

      if (playerStatIndex == -1) stats.push(playerStat);
      else stats[playerStatIndex] = playerStat;

      if (line.includes('hit by') || line.includes('killed by')) return stats; // prevent additional information from being fed to Alarms & UAVs

      HandleAlarmsAndUAVs(client, guildId, {
        time: info.time,
        player: info.player,
        playerID: info.playerID,
        pos: info.pos,
      });

    }

    if (line.includes('hit by Player')) {
      let data = line.includes('(DEAD)') ? [...line.matchAll(deadTemplate)][0] : [...line.matchAll(damageTemplate)][0];
      if (!data) return stats;

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        attacker: data[6],
        attackerID: data[7]
      }

      if (!client.exists(info.player) || !client.exists(info.playerID)) return stats;

      let playerStat = stats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = stats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = client.getDefaultPlayerStats(info.player, info.playerID);

      let newDt = await client.getDateEST(info.time);

      playerStat.lastDamageDate = newDt;
      playerStat.lastHitBy = info.attacker;

      if (playerStatIndex == -1) stats.push(playerStat);
      else stats[playerStatIndex] = playerStat;
    }

    return stats;
  },

  HandleActivePlayersList: async (client, guildId) => {
    client.activePlayersTick = 0; // reset hour tick

    let guild = await client.GetGuild(guildId);
    if (!client.exists(guild.playerstats)) guild.playerstats = [];
    if (!client.exists(guild.activePlayersChannel)) return;

    const channel = client.channels.cache.get(guild.activePlayersChannel);

    let activePlayers = guild.playerstats.filter(p => p.connected == true);

    if (activePlayers.length == 0) return;

    let des = ``;
    for (let i = 0; i < activePlayers.length; i++) {
      des += `**- ${activePlayers[i].gamertag}**\n`;
    }

    const activePlayersEmbed = new EmbedBuilder()
      .setColor(client.config.Colors.Default)
      .setTitle(`Online List - ${activePlayers.length} Player${activePlayers.length>1?'s':''} Online`)
      .setDescription(des);

    return channel.send({ embeds: [activePlayersEmbed] });
  }
}