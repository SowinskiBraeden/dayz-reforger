const mongoose = require('mongoose');

let userSchema = mongoose.Schema({
  user: {
    userID: String,
    guilds: {}
  },
});

userSchema.methods.createUser = function (userID, guildID, startingBalance) {
  this.user.userID = userID;
  this.user.guilds = {};
  this.user.guilds[guildID] = {
    balance: startingBalance,
    lastIncome: new Date('2000-01-01T00:00:00'),
  };
};

/*
  This function is to add a new guild specific user to an already existing
  user document
  or
  can be used to reset a data back to default
*/ 
function addUser(guilds, guildID, userID, client, startingBalance) {
  let updatedGuilds = guilds;
  updatedGuilds[guildID] = {
    balance: startingBalance,
    lastIncome: new Date('2000-01-01T00:00:00')
  }

  client.dbo.collection("users").updateOne({"user.userID":userID}, {$set: {"user.guilds": updatedGuilds}}, (err, res) => {
    if (err) return false
  })
  return true
}

module.exports = {
  User: mongoose.model('User', userSchema),
  addUser: addUser,
};
