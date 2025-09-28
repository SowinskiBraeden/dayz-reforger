import DayZR from "./DayZRBot";
import config from "./config/config";
import { GatewayIntentBits } from "discord.js";

import path from "path";
import fs from "fs";

// Log all uncaught exceptions before killing process.
process.on("uncaughtException", async (error: Error) => {
  console.trace(error);

  const log = JSON.stringify({
    level: "error",
    message: `${new Date().toISOString()} | uncaughtException: ${error.stack}`
  }) + "\n";

  try
  {
    await fs.promises.appendFile(path.join(__dirname, "./logs/Logs.log"), log);
  }
  catch (logErr)
  {
    console.error("Error writing uncaughtException to log file:", logErr);
  }
  finally
  {
    process.exit();
  }
});

const client: DayZR = new DayZR(
  {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers
    ]
  },
  config
);

client.build();