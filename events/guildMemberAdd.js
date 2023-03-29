const { EmbedBuilder } = require('discord.js');

module.exports = async (client, member) => {

  let GuildDB = await client.GetGuild(member.guild.id);
  const channel = client.channels.cache.get(GuildDB.welcomeChannel);

  let embed = new EmbedBuilder()
    .setColor(client.config.Colors.Default)
    .setDescription(`**Welcome** <@${member.user.id}> to **DayZ Reforger**\nTo gain access please use the command </gamertag-link:1087116946442559609>`);

  channel.send({ embeds: [embed] });
};