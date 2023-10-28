module.exports = {
  UpdatePlayer: async (client, player, interaction=null) => {
    return await client.dbo.collection("players").updateOne({"playerID": player.playerID}, {$set: player}, (err, _) => {
      if (err) {
        if (intearction == null) return client.error(err);
        else return client.sendInternalError(interaction, err);
      }
    });
  },

  getDefaultPlayer(gt, pID, NSID) {
    return {
      gamertag:              gt,
      playerID:              pID,
      discordID:             "",
      nitradoServerID:       NSID,

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
      connections:           0,
      
      bounties:              [],
    }
  }
}