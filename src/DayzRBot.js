const { RegisterGlobalCommands, RegisterGuildCommands } = require("../util/RegisterSlashCommands");
const { Collection, Client, EmbedBuilder, Routes, InteractionResponseType, InteractionType, GatewayDispatchEvents } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { REST } = require('@discordjs/rest');
const Logger = require("../util/Logger");
const crypto = require('crypto');

// custom util imports
const { DownloadNitradoFile, CheckServerStatus, FetchServerSettings, PostServerSettings, NitradoCredentialStatus } = require('../util/NitradoAPI');
const { HandlePlayerLogs, HandleActivePlayersList } = require('../util/LogsHandler');
const { HandleKillfeed, UpdateLastDeathDate } = require('../util/KillfeedHandler');
const { HandleExpiredUAVs, HandleEvents, PlaceFireplaceInAlarm } = require('../util/AlarmsHandler');
const { decrypt } = require('../util/Cryptic');
const { GetWebhook, WebhookSend } = require("../util/WebhookHandler");

// Data structures imports
const { getDefaultPlayer, UpdatePlayer } = require('../database/player');
const { Missions } = require('../database/destinations');
const { GetGuild } = require('../database/guild');

const path = require("path");
const fs = require('fs');
const readline = require('readline');

const minute = 60000; // 1 minute in milliseconds
const arInterval = 600000; // Set auto-restart interval 10 minutes (600,000ms)

class DayzRBot extends Client {

  constructor(options, config) {
    super(options);

    this.config = config;
    this.commands = new Collection();
    this.interactionHandlers = new Collection();
    this.logger = new Logger(path.join(__dirname, "..", "logs/Logs.log"));
    this.timer = this.config.Dev == 'PROD.' ? minute * 5 : minute / 4;

    if (
      this.config.Token     === "" ||
      this.config.SecretKey === "" ||
      this.config.SecretIv  === ""
    ) {
      throw new TypeError(
        "The config.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
      );
    }

    if (!["DEV.", "PROD."].includes(this.config.Dev)) {
      throw new TypeError(
        "The Dev version in the config.js does not match the allowed cases of 'DEV.' or 'PROD.'"
      );
    }

    // Generate secret hash with crypto to use for encryption
    this.key = crypto
      .createHash('sha512')
      .update(this.config.SecretKey)
      .digest('hex')
      .substring(0, 32);

    this.encryptionIV = crypto
      .createHash('sha512')
      .update(this.config.SecretIv)
      .digest('hex')
      .substring(0, 16);

    this.db;
    this.dbo;

    this.databaseConnected = false;
    this.arInterval        = arInterval;
    this.arIntervalIds     = new Map();
    this.playerSessions    = new Map();
    this.logHistory        = new Map();
    this.alarmPingQueue    = new Map();
    this.playerListMsgIds  = new Map();

    this.initialize();
    this.LoadCommandsAndInteractionHandlers();
    this.LoadEvents();

    this.Ready = false;
    this.activePlayersTick = 11;

    this.ws.on(GatewayDispatchEvents.InteractionCreate, async (interaction) => {
      const start = new Date().getTime();
      if (interaction.type == InteractionType.ApplicationCommand) {
        let GuildDB = await GetGuild(this, interaction.guild_id);

        if (this.exists(GuildDB.Nitrado) && this.exists(GuildDB.Nitrado.Auth)) {
          GuildDB.Nitrado.Auth = decrypt(
            GuildDB.Nitrado.Auth,
            this.config.EncryptionMethod,
            this.key,
            this.encryptionIV
          );
        }

        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;

        // Free unused armbands for related commands
        if (['armbands', 'claim', 'factions'].includes(command)) {
          for (const [factionID, data] of Object.entries(GuildDB.factionArmbands)) {
            const guild = this.guilds.cache.get(GuildDB.serverID);
            const role = guild.roles.cache.find(role => role.id == factionID);
            if (!role) {
              let query = {
                $pull: { 'server.usedArmbands': data.armband },
                $unset: { [`server.factionArmbands.${factionID}`]: "" },
              };
              this.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, query, (err, res) => {
                if (err) return this.sendInternalError(interaction, err);
              });
            }
          }
        }

        this.log(`Interaction [${interaction.guild_id}] - ${command}`);

        const rest = new REST({ version: '10' }).setToken(this.config.Token);
        
        // Easy to send response so ;)
        interaction.guild = await this.guilds.fetch(interaction.guild_id);
        const handleCallback = async (interactionType, message) => {
          return await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
            body: {
              type: interactionType,
              data: message,
            }
          });
        }

        // Nicely name our custom callback functions and pass correct type because discord is picky with numbers...
        interaction.send       = async (message) => handleCallback(InteractionResponseType.ChannelMessageWithSource,         message);
        interaction.deferReply = async (message) => handleCallback(InteractionResponseType.DeferredChannelMessageWithSource, message);
        interaction.showModal  = async (message) => handleCallback(InteractionResponseType.Modal,                            message);
        
        interaction.editReply = async (message) => {
          return await rest.patch(Routes.webhookMessage(this.application.id, interaction.token), {
            body: message,
          });
        };

        if (!this.databaseConnected) {
          let dbFailedEmbed = new EmbedBuilder()
            .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThe bot has failed to connect to the database 5 times!\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
            .setColor(this.config.Colors.Red)

          return interaction.send({ embeds: [dbFailedEmbed] });
        }

        let cmd = this.commands.get(command);
        try {
          cmd.SlashCommand.run(this, interaction, args, { GuildDB }, start); // start is only used in ping / stats command
        } catch (err) {
          this.sendInternalError(interaction, err);
        }
      }
    });
  }

  log(Text) { this.logger.log(Text); }
  error(Text) { this.logger.error(Text); }

  async getDateEST(time) {
    let timeArray = time.split(' ')[0].split(':');
    let t = new Date(); // Get current date & time (UTC)
    let f = new Date(t.getTime() - 4 * 3600000); // Convert UTC into EST time to roll back the day as necessary
    f.setUTCHours(timeArray[0], timeArray[1], timeArray[2]);  // Apply the supplied EST time to the converted date (EST is the timezone produced from the Nitrado logs).
    return new Date(f.getTime() + 4 * 3600000);  // Add EST time offset to return timestamp in UTC
  }

  async readLogs(guild) {
    const fileStream = fs.createReadStream(`./logs/${guild.Nitrado.ServerID}-logs.ADM`);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    let lines = [];
    for await (const line of rl) { lines.push(line); }

    let logIndex = lines.indexOf(this.logHistory.get(guild.Nitrado.ServerID));

    if (this.playerSessions.get(guild.Nitrado.ServerID).size === 0) {
      let players = await this.dbo.collection('players').find({"nitradoServerID": guild.Nitrado.ServerID}) // Get all players of this server
        .toArray().then(all => all.filter(p => p.connected).map(p => p.connected = false)); // assume all players who were previously connected are not connected on init only.
      
      for (let i = 0; i < players.length; i++) {
        await UpdatePlayer(this, players[i])
      }
    }

    for (let i = logIndex + 1; i < lines.length; i++) {
      // Handle lines to skip
      if (lines[i].includes('| ####')) continue;
      if (lines[i].includes("(id=Unknown") || lines[i].includes("Player \"Unknown Entity\"")) continue;
      if ((i - 1) >= 0 && lines[i] == lines[i - 1]) continue; // continue if this line is a duplicate of the last line

      // Handle general logs
      if (lines[i].includes('connected') || lines[i].includes('pos=<')) await HandlePlayerLogs(guild.Nitrado.ServerID, this, guild, lines[i], guild.combatLogTimer);
      if (lines[i].includes('killed by Zmb') || lines[i].includes('>) died.')) await UpdateLastDeathDate(guild.Nitrado.ServerID, this, lines[i]); // Updates users last death date for non PVP deaths.
      if (lines[i].includes(') placed Fireplace')) await PlaceFireplaceInAlarm(this, guild, lines[i]);
      
      // Handle killfeed logs
      if (
        (lines[i].includes('killed by  with') || lines[i].includes('killed by LandMineTrap'))                         || // Handle explosive deaths
        (!(i + 1 >= lines.length) && lines[i + 1].includes('killed by') && lines[i].includes('TransportHit'))         || // Handle vehicle deaths
        (!(i + 1 >= lines.length) && lines[i + 1].includes('killed by Player') && lines[i].includes('hit by Player')) || // Handle PVP deaths
        (lines[i].includes('killed by Player') && !lines[i - 1].includes('hit by Player'))                               // Handle deaths missing hit by log
      ) await HandleKillfeed(guild.Nitrado.ServerID, this, guild, lines[i]);
    }

    // Handle alarm pings
    const maxEmbed = 10;

    this.alarmPingQueue.forEach(queue => {
      queue.forEach(async (data, channel_id) => {
        const channel = this.GetChannel(channel_id);
        if (!channel) return;

        const NAME = "DayZ.R Zone Alert";
        const webhook = await GetWebhook(this, NAME, channel_id);   

        data.forEach(async (embeds, role) => {
          let embedArrays = [];
          while (embeds.length > 0)
            embedArrays.push(embeds.splice(0, maxEmbed));

          for (let i = 0; i < embedArrays.length; i++) { 
            let content = { embeds: embedArrays[i] };
            if (role != '-no-role-ping-') content.content = `<@&${role}>`;
            WebhookSend(this, webhook, content);
            
            // if (role == '-no-role-ping-') channel.send({ embeds: embedArrays[i] });
            // else channel.send({ content: `<@&${role}>`, embeds: embedArrays[i] });
          }
        });
      });
    });

    this.alarmPingQueue.set(guild.serverID, new Map()); // Clear alarm queue for this guild

    const playerTemplate = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
    let previouslyConnected = await this.dbo.collection('players').find({"nitradoServerID": guild.Nitrado.ServerID})
      .toArray().then(players => players.filter(p => p.connected)); // All players with connection log captured above and no disconnect log
    let lastDetectedTime;

    for (let i = lines.length - 1; i > 0; i--) {
      if (lines[i].includes('PlayerList log:')) {
        for (let j = i + 1; j < lines.length; j++) {
          let line = lines[j];
          if (line.includes('| ####')) break;

          let data = [...line.matchAll(playerTemplate)][0];
          if (!data) continue;

          let info = {
            time: data[1],
            player: data[2],
            playerID: data[3],
          };

          if (!this.exists(info.player) || !this.exists(info.playerID)) continue;  // Skip this player if the player does not exist.

          lastDetectedTime = await this.getDateEST(info.time);
          
          let playerStat = await this.dbo.collection("players").findOne({"playerID": info.playerID});
          if (!this.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, guild.Nitrado.ServerID);

          if (!previouslyConnected.includes(playerStat) && this.exists(playerStat.lastDisconnectionDate) && playerStat.lastDisconnectionDate !== null && playerStat.lastDisconnectionDate.getTime() > lastDetectedTime.getTime()) continue;  // Skip this player if the lastDisconnectionDate time is later than the player log entry.

          // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
          if (this.playerSessions.get(guild.Nitrado.ServerID).has(info.playerID)) {
            // Player is already in a session, update the session's end time.
            const session = this.playerSessions.get(guild.Nitrado.ServerID).get(info.playerID);
            session.endTime = lastDetectedTime; // Update end time.
          } else {
            // Player is not in a session, create a new session.
            const newSession = {
              startTime: lastDetectedTime,
              endTime: null, // Initialize end time as null.
            };
            this.playerSessions.get(guild.Nitrado.ServerID).set(info.playerID, newSession);

            // Check if the player has been marked as connected before, but only if a session doesn't exist
            // in the map, indicating the connection was discovered in the logs during this session.
            if (!previouslyConnected.includes(playerStat)) {
              playerStat.connected = true;
              playerStat.lastConnectionDate = lastDetectedTime; // Update last connection date.
            }
          }

          await UpdatePlayer(this, playerStat);
        }
        break;
      }
    }

    const lastLine = lines[lines.length - 1]
    this.logHistory.set(guild.Nitrado.ServerID, lastLine);
    this.dbo.collection("guilds").updateOne({ "server.serverID": guild.serverID }, {$set: { "server.lastLog": lastLine }}, (err, res) => {
      if (err) this.error(`Failed to save last log to guild config [${guild.serverID}] for nitrado server [${guild.Nitrado.ServerID}]`);
    });
  }

  async logsUpdateTimer(c) {
    c.activePlayersTick++;

    c.guilds.cache.forEach(async (guild) => {
      let GuildDB = await GetGuild(c, guild.id);
      
      /*
        Note to self:
        return statements do not prematurely exit out of a forEach loop like it does in a for loop.
      */

      if (!c.exists(GuildDB.Nitrado)) return; // Continue if no nitrado credentials
      if (GuildDB.Nitrado.Status == NitradoCredentialStatus.FAILED) return; // Continue if these credentials are marked as failed

      const NitradoCred = {
        ServerID: GuildDB.Nitrado.ServerID, 
        UserID: GuildDB.Nitrado.UserID,
        Auth: decrypt(
          GuildDB.Nitrado.Auth,
          c.config.EncryptionMethod,
          c.key,
          c.encryptionIV
        ),
      };

      const response = await FetchServerSettings(NitradoCred, c, "logsUpdateTimer").then(res => res);
      if (response == 1) {
        c.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID }, {$set: { "Nitrado.Status": NitradoCredentialStatus.FAILED }}, (err, _) => {
          if (err) this.error(`Failed to update Nitrado status to failed. [${GuildDB.serverID}]`);
        });
        return;
      };
      const settings = response.data.gameserver;

      // Update Nitrado DayZ Mission if change is detected
      if (GuildDB.Nitrado.Mission !== Missions[settings.settings.config.mission]) {
        c.dbo.collection("guilds").updateOne({"server.serverID": GuildDB.serverID}, {$set: { "Nitrado.Mission": Missions[settings.settings.config.mission] }}, (err, res) => {
          if (err) this.error(`Failed to save mission to guild config [${GuildDB.serverID}] for nitrado server [${GuildDB.Nitrado.ServerID}]`);
        });
      }

      GuildDB.Nitrado.Mission = Missions[settings.settings.config.mission];

      if (settings.game_specific.log_files.length == 0) return; // Ignore if no log files on Nitrado server
      const filename = settings.game_specific.log_files.sort((a, b) => a.length - b.length)[0];
      const path = `${settings.game_specific.path.slice(0, -1)}${filename.split(settings.game)[1]}`;

      // Ensure Player List is logged for next update
      const playerListEnabled = parseInt(settings.settings.config.adminLogPlayerList)
      if (!playerListEnabled) PostServerSettings(NitradoCred, c, "config", "adminLogPlayerList", '1')

      await DownloadNitradoFile(NitradoCred, c, path, `./logs/${NitradoCred.ServerID}-logs.ADM`).then(async (status) => {
        if (status == 1) return c.error(`Failed to Download Nitrado Log Files - [${NitradoCred.ServerID}]`);
        await c.readLogs(GuildDB).then(async () => {
          HandleExpiredUAVs(c, GuildDB);
          HandleEvents(c, GuildDB)
          if (c.activePlayersTick == 12) await HandleActivePlayersList(NitradoCred, c, GuildDB);
        })
      });
    });
  }

  async connectMongo(mongoURI, dbo) {
    let failed = false;

    let dbLogDir = path.join(__dirname, '..', 'logs', 'database-logs.json');
    let databaselogs;
    try {
      databaselogs = JSON.parse(fs.readFileSync(dbLogDir));
    } catch (err) {
      databaselogs = {
        attempts: 0,
        connected: false,
      };
    }

    if (databaselogs.attempts >= 5) {
      this.error('Failed to connect to mongodb after multiple attempts');
      return; // prevent further attempts
    }

    try {
      // Connect to Mongo database.
      this.db = await MongoClient.connect(mongoURI, { connectTimeoutMS: 1000 });
      this.dbo = this.db.db(dbo);
      this.log('Successfully connected to mongoDB');
      databaselogs.connected = true;
      databaselogs.attempts = 0; // reset attempts
      this.databaseConnected = true;
    } catch (err) {
      databaselogs.attempts++; 
      databaselogs.connected = false; 
      let db = mongoURI.includes("@") ? mongoURI.split("@")[1] : mongoURI.split("//")[1];
      db = db.includes("/") ? db.split("/")[0] : db;
      this.error(`Failed to connect to mongodb (mongodb://${db}/${dbo}): attempt ${databaselogs.attempts} - ${err}`);
      failed = true;
    }

    // write JSON string to a file
    fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

    if (failed) process.exit(-1);
  }

  async initialize() {
    // Wait for MongoDB to connect
    await this.connectMongo(this.config.mongoURI, this.config.dbo);

    if (!this.databaseConnected) return;
    let guilds = await this.dbo.collection("guilds").find({}).toArray();
   
    /*
      Initialize auto restart for enabled servers
      Initialize last logs
      Initialize Player Sessions
    */
    for (let i = 0; i < guilds.length; i++) {
      if (!this.exists(guilds[i].Nitrado)) continue;
      if (guilds[i].server.autoRestart) {
        const NitradoCred = {
          ServerID: guilds[i].Nitrado.ServerID, 
          UserID: guilds[i].Nitrado.UserID,
          Auth: decrypt(
            guilds[i].Nitrado.Auth,
            this.config.EncryptionMethod,
            this.key,
            this.encryptionIV
          )
        };
        this.arIntervalIds.set(guilds[i].server.serverID, setInterval(CheckServerStatus, this.arInterval, NitradoCred, this))
      }
      this.logHistory.set(guilds[i].Nitrado.ServerID, guilds[i].server.lastLog); // Using Nitrado Server ID over guild ID in case of future support for multiple nitrado servers in a single guild
      this.playerSessions.set(guilds[i].Nitrado.ServerID, new Map());            // Same reason here as named above.
      this.alarmPingQueue.set(guilds[i].server.serverID, new Map());                    // Initialize alarm queue to be empty
      this.playerListMsgIds.set(guilds[i].server.serverID, "");                         // Initialize player list message ids
      this.log(`[${guilds[i].server.serverID}] Initialized existing Nitrado Server: (${guilds[i].Nitrado.ServerID})`);
    }
  }

  async initNewNitradoServer(guildId, Nitrado) {
    let guild = await GetGuild(this, guildId)

    if (guild.autoRestart) this.arIntervalIds.set(guildId, setInterval(CheckServerStatus, this.arInterval, Nitrado, this))
    this.logHistory.set(Nitrado.ServerID, guild.lastLog);
    this.playerSessions.set(Nitrado.ServerID, new Map());
    this.alarmPingQueue.set(guildId, new Map());
    this.playerListMsgIds.set(guildId, "");
    this.log(`[${guildId}] Initialized new Nitrado`);
  }

  exists(n) { return typeof(n) == 'number' ? !isNaN(n) : null != n && undefined != n && "" != n }
  
  secondsToDhms(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
  }

  LoadCommandsAndInteractionHandlers() {
    let CommandsDir = path.join(__dirname, '..', 'commands');
    fs.readdir(CommandsDir, (err, files) => {
      if (err) this.error(err);
      else
        files.forEach((file) => {
          let cmd = require(CommandsDir + "/" + file);
          if (!this.exists(cmd.name) || !this.exists(cmd.description))
            return this.error(
              "Unable to load Command: " +
              file.split(".")[0] +
              ", Reason: File doesn't had name/desciption"
            );
          this.commands.set(file.split(".")[0].toLowerCase(), cmd);
          if (this.exists(cmd.Interactions)) {
            for (let [interaction, handler] of Object.entries(cmd.Interactions)) {
              this.interactionHandlers.set(interaction, handler);
            }
          }
          this.log("Command Loaded: " + file.split(".")[0]);
        });
    });
  }

  LoadEvents() {
    let EventsDir = path.join(__dirname, '..', 'events');
    fs.readdir(EventsDir, (err, files) => {
      if (err) this.error(err);
      else
        files.forEach((file) => {
          const event = require(EventsDir + "/" + file);
          if (['interactionCreate', 'guildMemberAdd'].includes(file.split(".")[0])) this.on(file.split(".")[0], i => event(this, i));
          else this.on(file.split(".")[0], event.bind(null, this));
          this.log("Event Loaded: " + file.split(".")[0]);
        });
    });
  }

  // Allows shorter lines of code elsewhere
  GetChannel(channel_id) { return this.channels.cache.get(channel_id); }

  sendError(Channel, Error) {
    this.error(Error);
    let embed = new EmbedBuilder()
      .setColor(this.config.Red)
      .setDescription(Error);

    Channel.send(embed);
  }

  // Handles internal errors for slash commands. E.g failed to update database from slash command.
  sendInternalError(Interaction, Error) {
    this.error(Error);
    const embed = new EmbedBuilder()
      .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThis command has crashed\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
      .setColor(this.config.Colors.Red)

    try {
      Interaction.send({ embeds: [embed] });
    } catch {
      Interaction.update({ embeds: [embed], components: [] });
    }
  }

  // Calls register for guild and global commands
  RegisterSlashCommands() {
    RegisterGlobalCommands(this);
    let p = Promise.resolve()
    this.guilds.cache.forEach((guild) => {
      p = p.then(() => {
        RegisterGuildCommands(this, guild.id);
        return new Promise((resolve) => {
          setTimeout(resolve, 500);
        })
      })
    });
  }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = DayzRBot;
