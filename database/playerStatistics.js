module.exports = {
  getDefaultPlayerStats(gt, pID) {
    return {
      gamertag:              gt,
      playerID:              pID,
      discordID:             "",

      KDR:                   0.00,
      kills:                 0,
      deaths:                0,
      killStreak:            0,
      bestKillStreak:        0,
      longestKill:           0,
      deathStreak:           0,
      worstDeathStreak:      0,
      
      pos:                   [],
      lastPos:               [],
      time:                  null,
      lastTime:              null,
      
      lastConnectionDate:    null,
      lastDisconnectionDate: null,
      lastDamageDate:        null,
      lastDeathDate:         null,
      lastHitBy:             null,
      connected:             false,
      
      totalSessionTime:      0,
      lastSessionTime:       0,
      longestSessionTime:    0,
      
      bounties:              [],
    }
  }
}