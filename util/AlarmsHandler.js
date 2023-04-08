const { HandlePlayerBan } = require('./NitradoAPI');
const { EmbedBuilder } = require('discord.js');

module.exports = {

  HandleAlarms: async (client, guildId, data) => {

    let guild = await client.GetGuild(guildId);

    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      if (alarm.disabled) continue; // ignore if alarm is disabled due to emp
      if (alarm.ignoredPlayers.includes(data.playerID)) continue;

      let diff = [Math.round(alarm.origin[0] - data.pos[0]), Math.round(alarm.origin[1] - data.pos[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2)

      if (distance < alarm.radius) {
        const channel = client.channels.cache.get(alarm.channel);

        let newDt = await client.getDateEST(data.time);
        let unixTime = Math.floor(newDt.getTime()/1000);
        
        if (alarm.rules.includes['ban_on_entry']) {

          let alarmEmbed = new EmbedBuilder()
            .setColor(client.config.Colors.Default)
            .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.player}** was located within **${distance} meters** of the Zone **${alarm.name}** __and has been banned.__`)
            .addFields({ name: '**Location**', value: `**[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**`, inline: false })
        
          channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });

          HandlePlayerBan(client, data.player, true);
        }

        let alarmEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.player}** was located within **${distance} meters** of the Zone **${alarm.name}**`)
          .addFields({ name: '**Location**', value: `**[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**`, inline: false })
      
        return await channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });
      }
    }
  },

  KillInAlarm: async (client, guildId, data) => {
    
    let guild = await client.GetGuild(guildId);
    
    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      if (alarm.disabled || !alarm.rules.includes('ban_on_kill')) continue; // ignore if alarm is disabled or not ban on kill;
      if (alarm.ignoredPlayers.includes(data.killerID)) continue;

      let diff = [Math.round(alarm.origin[0] - data.killerPOS[0]), Math.round(alarm.origin[1] - data.killerPOS[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2)

      if (distance < alarm.radius) {
        const channel = client.channels.cache.get(alarm.channel);

        let newDt = await client.getDateEST(data.time);
        let unixTime = Math.floor(newDt.getTime()/1000);

        let alarmEmbed = new EmbedBuilder()
          .setColor(client.config.Colors.Default)
          .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.killer}** was located within **${distance} meters** of the Zone **${alarm.name}** __and has been banned for killing **${data.victim}**.__`)
          .addFields({ name: '**Location**', value: `**[${data.killerPOS[0]}, ${data.killerPOS[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.killerPOS[0]};${data.killerPOS[1]})**`, inline: false })
      
        channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });

        HandlePlayerBan(client, data.player, true);
      }
    }
  }
}