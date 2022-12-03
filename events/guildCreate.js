module.exports = (client, guild) => {
  require("../util/RegisterSlashCommands").RegisterGuildCommands(client, guild.id);
};