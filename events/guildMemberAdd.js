const { EmbedBuilder } = require('discord.js');
const { GetGuild } = require('../database/guild');

module.exports = async (client, member) => {

  let GuildDB = await GetGuild(client, member.guild.id);
  if (!client.exists(GuildDB.welcomeChannel)) return;
  const channel = client.GetChannel(GuildDB.welcomeChannel);

  if (GuildDB.serverName == "") GuildDB.serverName = "our server!"

  let embed = new EmbedBuilder()
    .setColor(client.config.Colors.Default)
    .setDescription(`**Welcome** <@${member.user.id}> to **${GuildDB.serverName}**\nUse the </gamertag-link:1087116946442559609> command to link your Discord to your gamertag.`);

  channel.send({ content: `<@${member.user.id}>`, embeds: [embed] });
};
