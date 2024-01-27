module.exports = {
  GetGuild: async (client, GuildId) => {
    let guild = undefined;
    if (client.databaseConnected) guild = await client.dbo.collection("guilds").findOne({"server.serverID":GuildId}).then(guild => guild);

    // If guild not found, generate guild default
    if (!guild) {
      guild = {}
      guild.server = module.exports.getDefaultSettings(GuildId);
      if (client.databaseConnected) {
        client.dbo.collection("guilds").insertOne(guild, (err, res) => {
          if (err) throw err;
        });
      }
    }

    return {
      serverID:              GuildId,
      serverName:            guild.server.serverName,
      autoRestart:           guild.server.autoRestart,
      showKillfeedCoords:    guild.server.showKillfeedCoords,
      showKillfeedWeapon:    guild.server.showKillfeedWeapon,
      purchaseUAV:           guild.server.purchaseUAV,
      purchaseEMP:           guild.server.purchaseEMP,
      allowedChannels:       guild.server.allowedChannels,
      customChannelStatus:   guild.server.allowedChannels.length > 0 ? true : false,
      hasBotAdmin:           guild.server.botAdminRoles.length > 0 ? true : false,
      
      killfeedChannel:       guild.server.killfeedChannel,
      connectionLogsChannel: guild.server.connectionLogsChannel,
      activePlayersChannel:  guild.server.activePlayersChannel,
      welcomeChannel:        guild.server.welcomeChannel,
      
      factionArmbands:       guild.server.factionArmbands,
      usedArmbands:          guild.server.usedArmbands,
      excludedRoles:         guild.server.excludedRoles,
      botAdminRoles:         guild.server.botAdminRoles,
            
      alarms:                guild.server.alarms,
      events:                guild.server.events,
      uavs:                  guild.server.uavs,
      
      incomeRoles:           guild.server.incomeRoles,
      incomeLimiter:         guild.server.incomeLimiter,
      
      startingBalance:       guild.server.startingBalance,
      uavPrice:              guild.server.uavPrice,
      empPrice:              guild.server.empPrice,
      
      linkedGamertagRole:    guild.server.linkedGamertagRole,
      memberRole:            guild.server.memberRole,
      adminRole:             guild.server.adminRole,
      
      combatLogTimer:        guild.server.combatLogTimer,
    };
  },

  getDefaultSettings(GuildId) {
    return {
      serverID:              GuildId,
      serverName:            "our server!",
      autoRestart:           0,
      showKillfeedCoords:    0,
      showKillfeedWeapon:    0,
      purchaseUAV:           1, // Allow/Disallow purchase of UAVs
      purchaseEMP:           1, // Allow/Disallow purchase of EMPs
      allowedChannels:       [],

      killfeedChannel:       "",
      connectionLogsChannel: "",
      activePlayersChannel:  "",
      welcomeChannel:        "",
      
      factionArmbands:       {},
      usedArmbands:          [],
      excludedRoles:         [],
      botAdminRoles:         [],
      
      alarms:                [],
      events:                [],
      uavs:                  [],
      
      incomeRoles:           [],
      incomeLimiter:         168, // # of hours in 7 days
      
      startingBalance:       500,
      uavPrice:              50000,
      empPrice:              500000,
      
      linkedGamertagRole:    "",
      memberRole:            "",
      adminRole:             "",
      
      combatLogTimer:        5, // minutes
    }
  }
}
