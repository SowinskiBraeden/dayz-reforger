const { EmbedBuilder } = require('discord.js');
const { nearest } = require('../database/destinations');

module.exports = {

  SendConnectionLogs: async (client, guild, data) => {
    if (!client.exists(guild.connectionLogsChannel)) return;
    const channel = client.GetChannel(guild.connectionLogsChannel);

    let newDt = await client.getDateEST(data.time);
    let unixTime = Math.floor(newDt.getTime() / 1000);

    let connectionLog = new EmbedBuilder()
      .setColor(data.connected ? client.config.Colors.Green : client.config.Colors.Red)
      .setDescription(`**${data.connected ? 'Connect' : 'Disconnect'} Event - <t:${unixTime}>\n${data.player} ${data.connected ? 'Connected' : 'Disconnected'}**`);

    if (!data.connected) {
      if (data.lastConnectionDate != null) {
        let oldUnixTime = Math.floor(data.lastConnectionDate.getTime() / 1000);
        let sessionTime = client.secondsToDhms(unixTime - oldUnixTime);
        connectionLog.addFields({ name: '**Session Time**', value: `**${sessionTime}**`, inline: false });
      } else connectionLog.addFields({ name: '**Session Time**', value: `**Unknown**`, inline: false });
    }

    if (client.exists(channel)) await channel.send({ embeds: [connectionLog] });
  },

  DetectCombatLog: async (client, guild, data) => {
    if (!client.exists(data.lastDamageDate)) return;
    if (!client.exists(guild.connectionLogsChannel)) return;

    const newDt = await client.getDateEST(data.time);
    const diffSeconds = Math.round((newDt.getTime() - data.lastDamageDate.getTime()) / 1000);

    // If diff is greater than 5 minutes, not a combat log
    // or if death after last combat
    if (diffSeconds > (data.combatLogTimer * 60)) return;
    if (data.lastDamageDate <= data.lastDeathDate) return;

    // If lastHitBy (attacker) died after shooting this player
    // then it does not count as combat logging, (the combat ended due to death)
    let attacker = await client.dbo.collection("players").findOne({"gamertag": data.lastHitBy});
    if (attacker.lastDeathDate > data.lastDamageDate) return;    

    const channel = client.GetChannel(guild.connectionLogsChannel);
    if (!channel) return;

    let unixTime = Math.floor(newDt.getTime() / 1000);
    const destination = nearest(data.pos, guild.Nitrado.Mission);

    let combatLog = new EmbedBuilder()
      .setColor(client.config.Colors.Red)
      .setDescription(`**NOTICE:**\n**${data.player}** has combat logged at <t:${unixTime}> when fighting **${data.lastHitBy}\nLocation [${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**\n${destination}`);

    if (client.exists(guild.adminRole)) channel.send({ content: `<@&${guild.adminRole}>` });

    return channel.send({ embeds: [combatLog] });
  }
};
