const { BanPlayer, UnbanPlayer } = require('./NitradoAPI');
const { EmbedBuilder } = require('discord.js');
const { nearest } = require('../database/destinations');
const { GetGuild } = require('../database/guild');
const { GetWebhook, WebhookSend } = require("../util/WebhookHandler");

// Private functions (only called locally)

const ExpireEvent = async(client, guild, e) => {
  let hasMR = (guild.memberRole != "");
  const channel = client.GetChannel(e.channel);
  if (client.exists(e.channel)) channel.send({ embeds: [new EmbedBuilder().setColor(client.config.Colors.Default).setDescription(`${hasMR ? `<@&${guild.memberRole}>\n`:''}**The ${e.name} Event has ended!**`)] });

  client.dbo.collection("guilds").updateOne({ "server.serverID": guild.serverID }, {
    $pull: {
      "server.events": e
    }
  }, (err, res) => {
    if (err) return client.sendError(client.GetChannel(guild.adminLogsChannel), err);
  });
}

const HandlePlayerTrackEvent = async (client, guild, e) => {
  if (!client.exists(e.channel)) return ExpireEvent(client, guild, e); // Expire event since it has invalid channel.
  const channel = client.GetChannel(e.channel);
  if (!channel) return;

  let player = await client.dbo.collection("players").findOne({"gamertag": e.gamertag});

  let newDt = await client.getDateEST(player.time);
  let unixTime = Math.floor(newDt.getTime()/1000);

  const destination = nearest(player.pos, guild.Nitrado.Mission);

  const trackEvent = new EmbedBuilder()
    .setColor(client.config.Colors.Default)
    .setDescription(`**${e.name} Event**\n${e.gamertag} was located at **[${player.pos[0]}, ${player.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${player.pos[0]};${player.pos[1]})** at <t:${unixTime}>\n${destination}`);

  const NAME = "DayZ.R Player Tracker";
  const webhook = await GetWebhook(client, NAME, e.channel);

  let content = { embeds: [trackEvent] };
  if (client.exists(guild.adminRole)) content.content = `<@&${e.role}>`;
  WebhookSend(client, webhook, content);

  // if (e.role) channel.send({ content: `<@&${e.role}>`, embeds: [trackEvent] });
  // else channel.send({ embeds: [trackEvent] });

  let now = new Date();
  let diff = ((now - e.creationDate) / 1000) / 60;
  let minutesBetweenDates = Math.abs(Math.round(diff));

  if (minutesBetweenDates >= e.time) ExpireEvent(client, guild, e);
}

// Public functions (called externally)

module.exports = {

  HandleAlarmsAndUAVs: async (client, guild, data) => {

    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      let now = new Date();
      if (alarm.uavExpire!=null&&alarm.uavExpire<now) alarm.disabled = false;
      if (alarm.disabled) continue; // ignore if alarm is disabled due to emp
      if (alarm.ignoredPlayers.includes(data.playerID)) continue;

      let diff = [Math.round(alarm.origin[0] - data.pos[0]), Math.round(alarm.origin[1] - data.pos[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2)

      if (distance < alarm.radius) {

        let newDt = await client.getDateEST(data.time);
        let unixTime = Math.floor(newDt.getTime()/1000);

        if (!client.alarmPingQueue.get(guild.serverID).has(alarm.channel)) client.alarmPingQueue.get(guild.serverID).set(alarm.channel, new Map());
        let route = alarm.mute ? null : alarm.role;
        if (!client.alarmPingQueue.get(guild.serverID).get(alarm.channel).has(route)) client.alarmPingQueue.get(guild.serverID).get(alarm.channel).set(route, []);

        if (alarm.rules.includes['ban_on_entry']) {
          client.alarmPingQueue.get(guild.serverID).get(alarm.channel).get(route).push(
            new EmbedBuilder()
              .setColor(client.config.Colors.Default)
              .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.player}** was located within **${distance} meters** of the Zone **${alarm.name}** __and has been banned.__`)
              .addFields({ name: '**Location**', value: `**[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**`, inline: false })
          );

          BanPlayer(client, data.player);
          return;
        }

        client.alarmPingQueue.get(guild.serverID).get(alarm.channel).get(route).push(
          new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.player}** was located within **${distance} meters** of the Zone **${alarm.name}**`)
            .addFields({ name: '**Location**', value: `**[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**`, inline: false })
        );
      
        return;
      }
    }

    for (let i = 0; i < guild.uavs.length; i++) {
      let uav = guild.uavs[i];

      let diff = [Math.round(uav.origin[0] - data.pos[0]), Math.round(uav.origin[1] - data.pos[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2);

      if (distance < uav.radius) {
        let newDt = await client.getDateEST(data.time);
        let unixTime = Math.floor(newDt.getTime()/1000);

        const destination = nearest(data.pos, guild.Nitrado.Mission);

        let uavEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**UAV Detection - <t:${unixTime}>**\n**${data.player}** was spotted in the UAV zone at **[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})\n${destination}**`)
      
        client.users.fetch(uav.owner, false).then((user) => {
          user.send({ embeds: [uavEmbed] });
        });
      }
    }
  },

  HandleExpiredUAVs: async (client, guild) => {
    let uavs = guild.uavs;
    let update = false;

    for (let i = 0; i < uavs.length; i++) {
      let uav = uavs[i];

      let now = new Date();
      let diff = Math.round((now.getTime() - uav.creationDate.getTime()) / 1000 / 60); // diff minutes
  
      if (diff <= 30) continue;
    
      uavs.splice(i, 1);
      update = true;

      let expired = new EmbedBuilder().setColor(client.config.Colors.Red).setDescription("**Low Battery**\nUAV has run out of battery and is no longer active.");

      client.users.fetch(uav.owner, false).then((user) => {
        user.send({ embeds: [expired] });
      });
    }

    if (update) {
      client.dbo.collection("guilds").updateOne({ "server.serverID":  guild.serverID }, {$set: { "server.uavs": uavs }}, (err, res) => {
        if (err) return client.sendError(client.GetChannel(guild.adminLogsChannel), err);
      });
    }
  },

  KillInAlarm: async (client, guildId, data) => {
    
    let guild = await GetGuild(client, guildId);
    
    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      if (alarm.disabled || !alarm.rules.includes('ban_on_kill')) continue; // ignore if alarm is disabled or not ban on kill;
      if (alarm.ignoredPlayers.includes(data.killerID)) continue;

      let diff = [Math.round(alarm.origin[0] - data.killerPOS[0]), Math.round(alarm.origin[1] - data.killerPOS[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2)

      if (distance < alarm.radius) {
        const channel = client.GetChannel(alarm.channel);
        if (!channel) continue;

        let newDt = await client.getDateEST(data.time);
        let unixTime = Math.floor(newDt.getTime()/1000);

        let alarmEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.killer}** was located within **${distance} meters** of the Zone **${alarm.name}** __and has been banned for killing **${data.victim}**.__`)
          .addFields({ name: '**Location**', value: `**[${data.killerPOS[0]}, ${data.killerPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.killerPOS[0]};${data.killerPOS[1]})**`, inline: false })
      
        const NAME = "DayZ.R Zone Alert";
        const webhook = await GetWebhook(client, NAME, alarm.channel);
        
        let content = { content: `<@&${alarm.role}>`, embeds: [alarmEmbed] };
        WebhookSend(client, webhook, content);

        // channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });

        BanPlayer(client, data.killer);
       break;
      }
    }
    return;
  },

  PlaceFireplaceInAlarm: async (client, guild, line) => {

    let fireplacePlacement = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\) placed Fireplace/g;
    let data = [...line.matchAll(fireplacePlacement)][0];
    if (!data) return;

    let info = {
      time:      data[1],
      player:    data[2],
      playerID:  data[3],
      playerPOS: data[4].split(', ').map(v => parseFloat(v)),
    };

    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      if (alarm.disabled || !alarm.rules.includes('ban_on_fireplace_placement')) continue;
      if (alarm.ignoredPlayers.includes(info.playerID)) continue;

      let diff = [Math.round(alarm.origin[0] - info.playerPOS[0]), Math.round(alarm.origin[1] - info.playerPOS[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2);

      if (distance < alarm.radius) {
        const channel = client.GetChannel(alarm.channel);
        if (!channel) return;

        let newDt = await client.getDateEST(info.time);
        let unixTime = Math.floor(newDt.getTime()/1000);

        let alarmEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${info.player}** was located within **${distance} meters** of the Zone **${alarm.name}** __and has been banned for **placing a fireplace**.__`)
          .addFields({ name: '**Location**', value: `**[${info.playerPOS[0]}, ${info.playerPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${info.playerPOS[0]};${info.playerPOS[1]})**`, inline: false })
      
        const NAME = "DayZ.R Zone Alert";
        const webhook = await GetWebhook(client, NAME, alarm.channel);
        
        let content = { content: `<@&${alarm.role}>`, embeds: [alarmEmbed] };
        WebhookSend(client, webhook, content);

        // channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });

        BanPlayer(client, info.player);
        break;
      }
    }
    return;
  },

  HandleEvents: async (client, guild) => {
    for (let i = 0; i < guild.events.length; i++) {
      let event = guild.events[i];
      if (event.type == 'player-track') HandlePlayerTrackEvent(client, guild, event);
    }
  },
}
