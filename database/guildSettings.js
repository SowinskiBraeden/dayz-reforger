module.exports = {
  getDefaultSettings(GuildId) {
    return {
      serverID:              GuildId,
      autoRestart:           0, // 
      showKillfeedCoords:    0, 
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
      
      playerstats:           [], // to be removed
      
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
