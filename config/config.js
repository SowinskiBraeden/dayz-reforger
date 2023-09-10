const package = require('../package.json');
require('dotenv').config();

module.exports = {
	Dev: process.env.Dev || "DEV.",                     
	Version: package.version, // (major).(feature).(revision/bug/refactoring)
  Admins: ["362791661274660874", "329371697570381824"], // Admins of the bot
  ServerID: "1050215624053374976",
  GuildID: process.env.GuildID || "",
	SupportServer: "https://discord.gg/KVFJCvvFtK", //Support Server Link
	Token: process.env.token || "", //Discord Bot Token
  Scopes: ["identify", "guilds", "applications.commands"], //Discord OAuth2 Scopes
  Nitrado: {
    ServerID: process.env.SERVER_ID,
    UserID: process.env.USER_ID,
    Auth: process.env.AUTH_KEY
  },
  IconURL: "",
  Colors: {
    Default: "#8a7c72",
    DarkRed: "#ba0f0f",
    Red: "#f55c5c",
    Green: "#32a852",
    Yellow: "#ffb01f"
  },
  Permissions: 2205281600,
  mongoURI: process.env.mongoURI || "mongodb://localhost:27017",
  dbo: process.env.dbo || "knoldus",
  Presence: {
    type: CommandOptions.String, // Watching, Playing = 0, Streaming = 1, Listening = 2, Custom = 4, Competing = 5
    name: "DayZ Logs", // What message you want after type
    status: "online", // You can show either "idle", "dnd", "online", or "offline"
  },
}
