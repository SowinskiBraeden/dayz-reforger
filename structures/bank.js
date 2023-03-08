const mongoose = require('mongoose');

let bankSchema = mongoose.Schema({
  banking: {
    userID: String,
    guilds: {}
  }
});

bankSchema.methods.createBank = function (userID, guildID, startingBalance, cash) {
  this.banking.userID = userID;
  this.banking.guilds = {};
  this.banking.guilds[guildID] = {
    account: {
      balance: startingBalance,
      cash: cash,
    }
  };;
};

/*
  This function is to add a new guild specific bank to an already existing
  bank document
  or
  can be used to reset a data back to default
*/ 
function addBank(guilds, guildID, userID, client, startingBalance) {
  let updatedGuilds = guilds;
  updatedGuilds[guildID] = {
    account: {
      balance: startingBalance,
      cash: 0.00,
    }
  }

  client.dbo.collection("banks").updateOne({"banking.userID":userID}, {$set: {"banking.guilds": updatedGuilds}}, function(err, res) {
    if (err) return false
  })
  return true
}

module.exports = {
  Bank: mongoose.model('Bank', bankSchema),
  addBank: addBank,
};
