const { weapons } = require('./weapons');

// Creates a copy of an object to prevent mutation of parent (i.e BodyParts, createWeaponsObject)
const copy = (obj) => JSON.parse(JSON.stringify(obj));

const BodyParts = {
  Head:     0,
  Torso:    0,
  RightArm: 0,
  LeftArm:  0,
  RightLeg: 0,
  LeftLeg:  0,
};

const createWeaponsObject = (value) => {
  const defaultWeapons = {};
  for (const [_, weaponNames] of Object.entries(weapons)) {
    for (const [name, _] of Object.entries(weaponNames)) {
      defaultWeapons[name] = value;
    }
  }
  return copy(defaultWeapons);
};

module.exports = {
  UpdatePlayer: async (client, player, interaction=null) => {
    return await client.dbo.collection("players").updateOne(
      { "playerID": player.playerID },
      { $set: player },
      { upsert: true }, // Create player stat document if it does not exist
      (err, _) => {
        if (err) {
          if (intearction == null) return client.error(err);
          else return client.sendInternalError(interaction, err);
        }
      }
    );
  },

  getDefaultPlayer(gt, pID, NSID) {
    return {
      // Identifiers
      gamertag:               gt,
      playerID:               pID,
      discordID:              "",
      nitradoServerID:        NSID,

      // General PVP Stats
      KDR:                    0.00,
      kills:                  0,
      deaths:                 0,
      killStreak:             0,
      bestKillStreak:         0,
      longestKill:            0,
      deathStreak:            0,
      worstDeathStreak:       0,
      
      // In depth PVP Stats
      shotsLanded:            0,
      timesShot:              0,
      shotsLandedPerBodyPart: copy(BodyParts),
      timesShotPerBodyPart:   copy(BodyParts),
      weaponStats:            createWeaponsObject({
        shotsLanded: 0,
        timesShot:   0,
        shotsLandedPerBodyPart: copy(BodyParts),
        timesShotPerBodyPart:   copy(BodyParts),
      }),
      
      // General Session Data
      lastConnectionDate:     null,
      lastDisconnectionDate:  null,
      lastDamageDate:         null,
      lastDeathDate:          null,
      lastHitBy:              null,
      connected:              false,
      pos:                    [],
      lastPos:                [],
      time:                   null,
      lastTime:               null,
      
      // Session Stats
      totalSessionTime:       0,
      lastSessionTime:        0,
      longestSessionTime:     0,
      connections:            0,
 
      // Other
      bounties:               [],
    }
  },

  insertPVPstats(player) {
    player.shotsLanded = 0;
    player.timesShot = 0;
    player.shotsLandedPerBodyPart = copy(BodyParts);
    player.timesShotPerBodyPart = copy(BodyParts);
    player.weaponStats = createWeaponsObject({
      shotsLanded: 0,
      timesShot:   0,
      shotsLandedPerBodyPart: copy(BodyParts),
      timesShotPerBodyPart:   copy(BodyParts),
    });
    return player;
  }
}
