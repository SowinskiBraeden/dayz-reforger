module.exports = {
  createUser: async (userID, initialGuildID, startingBalance, client) => {
    let User = {
      user: {
        userID: userID,
        guilds: {}
      }
    };

    User.user.guilds[initialGuildID] = {
      balance: startingBalance,
      lastIncome: new Date('2000-01-01T00:00:00'),
    };

    await client.dbo.collection("users").insertOne(User, (err, res) => {
      if (err) {
        client.error(`Failed to create user - ${err}`);
        return undefined;
      }
    });

    return User;
  },

  /*
    This function is to add a new guild specific user to an already existing
    user document
    or
    can be used to reset a data back to default
  */
  addUser: async (guilds, newGuildID, userID, client, startingBalance) => {
    let updatedGuilds = guilds;
    updatedGuilds[newGuildID] = {
      balance: startingBalance,
      lastIncome: new Date('2000-01-01T00:00:00')
    }

    await client.dbo.collection("users").updateOne({"user.userID":userID}, {$set: {"user.guilds": updatedGuilds}}, (err, res) => {
      if (err) return false
    })
    return true
  }
}
