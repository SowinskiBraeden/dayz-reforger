require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const guildId = process.env.GuildID;
const URI = process.env.mongoURI;
const dbo = process.env.dbo;
const NitradoServerID = process.env.SERVER_ID;
const client = new MongoClient(URI);

/*
  !WARNING!

  THIS SCRIPT IS MEANT ONLY FOR BOT ADMINISTRATORS WHO ARE RUNNING THE BOT + DATABASE
  
  This script will migrate all playerstats from the guildSettings document in the "guilds" collection,
  to their own collection as their own documents in the new "players" collection.

  Only run this once you have bot version ^12.0.0 or higher.
*/

async function migrate() {
  const package = await JSON.parse(fs.readFileSync('../package.json'));
  const version = package.version.split('.').map(v => parseInt(v));

  // Ensure version is 12.0.4 or higher.
  if (version[0] < 12, version[2] < 4) throw new Error('Bot version does not meet requirements: v^12.0.4');

  try {
    // Get the database and collection on which to run the operation
    const database = client.db(dbo);
    const players = database.collection("players");
    const guilds = database.collection("guilds");

    // Get current guild settings + player stats
    let guild = await guilds.findOne({"server.serverID": guildId});

    // Create backup dir
    const dir = __dirname + '/backup';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }

    // Ensure new required values are inserted into player stat.
    guild.server.playerstats.map(stat => stat.nitradoServerID = NitradoServerID);
    guild.server.playerstats.map(stat => stat.bountiesLength = stat.bounties.length);

    // write JSON to file
    fs.writeFileSync(`${dir}/player_stats_backup.json`, JSON.stringify(guild.server.playerstats, null, 2));
    console.log(`A backup of playerstats was successfully created in ./backup/player_stats_backup.json in case of a fatal error.`);

    // Move player stats to new collection.
    const result = await players.insertMany(guild.server.playerstats, { ordered: true });
    console.log(`${result.insertedCount} documents were inserted to "players" collections.`);

    // Removes player stats from guild settings.
    delete guild.server.playerstats;

    // Update guild settings with removed player stats.
    await guilds.updateOne({"server.serverID": guildId}, {$set: guild});

  } catch (err) {
    throw new Error(`An error occured while attempting to migrate player stats: ${err}`)
  } finally {
    await client.close();
    console.log(`Successfully migrated player stats into the "players" collection.`);
  }
}

migrate()
