module.exports = (client, guild) => {
    require("../services/RegisterSlashCommands").RegisterGuildCommands(client, guild.id);
};