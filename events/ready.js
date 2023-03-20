module.exports = async (client) => {
  (client.Ready = true),
    client.user.setActivity(
      client.config.Presence.name,
      client.config.Presence.type
    );
  client.log(`Successfully Logged in as ${client.user.tag}`);
  client.log(`Ready to serve in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.`)
  client.RegisterSlashCommands();
  // client.logsUpdateTimer();
};