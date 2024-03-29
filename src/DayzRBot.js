const { RegisterGlobalCommands, RegisterGuildCommands } = require("../util/RegisterSlashCommands");
const { Collection, Client, EmbedBuilder, Routes } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { REST } = require('@discordjs/rest');
const Logger = require("../util/Logger");

// custom util imports
const { DownloadNitradoFile, CheckServerStatus, FetchServerSettings, PostServerSettings } = require('../util/NitradoAPI');
const { HandlePlayerLogs, HandleActivePlayersList } = require('../util/LogsHandler');
const { HandleKillfeed, UpdateLastDeathDate } = require('../util/KillfeedHandler');
const { HandleExpiredUAVs, HandleEvents, PlaceFireplaceInAlarm } = require('../util/AlarmsHandler');

// Data structures imports
const { getDefaultPlayer, UpdatePlayer } = require('../database/player');
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

    if (this.config.Token === "" || this.config.GuildID === "") {
      throw new TypeError(
        "The config.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
      );
    }

    this.db;
    this.dbo;
    this.databaseConnected = false;
    this.arInterval = arInterval;
    this.arIntervalId; // Interval for auto-restart functions
    this.playerSessions = new Map();
    this.alarmPingQueue = {};
    this.processingLogs = false;
    this.autoRestartInit();
    this.LoadCommandsAndInteractionHandlers();
    this.LoadEvents();

    this.Ready = false;
    this.activePlayersTick = 11;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      const start = new Date().getTime();
      if (interaction.type != 3) {
        let GuildDB = await GetGuild(this, interaction.guild_id);

        for (const [factionID, data] of Object.entries(GuildDB.factionArmbands)) {
          const guild = this.guilds.cache.get(GuildDB.serverID);
          const role = guild.roles.cache.find(role => role.id == factionID);
          if (!role) {
            let query = {
              $pull: { 'server.usedArmbands': data.armband },
              $unset: { [`server.factionArmbands.${factionID}`]: "" },
            };
            await this.dbo.collection("guilds").updateOne({ 'server.serverID': GuildDB.serverID }, query, (err, res) => {
              if (err) return this.sendInternalError(interaction, err);
            });
          }
        }

        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;

        this.log(`Interaction - ${command}`);

        this.rest = new REST({ version: '10' }).setToken(this.config.Token);

        // Easy to send response so ;)
        interaction.guild = await this.guilds.fetch(interaction.guild_id);
        interaction.send = async (message) => {
          return await this.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
            body: {
              type: 4,
              data: message,
            }
          });
        };

        interaction.deferReply = async (message) => {
          return await this.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
            body: {
              type: 5,
              data: message,
            }
          });
        };

        interaction.editReply = async (message) => {
          return await this.rest.patch(Routes.webhookMessage(this.application.id, interaction.token), {
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
    const fileStream = fs.createReadStream('./logs/server-logs.ADM');

    let logHistoryDir = path.join(__dirname, '..', 'logs', 'history-logs.ADM.json');
    let history;
    try {
      history = JSON.parse(fs.readFileSync(logHistoryDir));
    } catch (err) {
      history = {
        lastLog: null
      };
    }

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    let lines = [];
    for await (const line of rl) { lines.push(line); }

    let logIndex = lines.indexOf(history.lastLog);

    if (this.playerSessions.size === 0) {
      let players = await this.dbo.collection('players').find({"connected": true}).toArray();
      players.map(p => p.connected = false); // assume all players not connected on init only.
      for (let i = 0; i < players.length; i++) {
        UpdatePlayer(this, players[i])
      }
    }

    for (let i = logIndex + 1; i < lines.length; i++) {
      // Handle lines to skip
      if (lines[i].includes('| ####')) continue;
      if (lines[i].includes("(id=Unknown") || lines[i].includes("Player \"Unknown Entity\"")) continue;
      if ((i - 1) >= 0 && lines[i] == lines[i - 1]) continue; // continue if this line is a duplicate of the last line

      // Handle general logs
      if (lines[i].includes('connected') || lines[i].includes('pos=<')) await HandlePlayerLogs(this, guild, lines[i], guild.combatLogTimer);
      if (lines[i].includes('killed by Zmb') || lines[i].includes('>) died.')) await UpdateLastDeathDate(this, lines[i]); // Updates users last death date for non PVP deaths.
      if (lines[i].includes(') placed Fireplace')) await PlaceFireplaceInAlarm(this, guild, lines[i]);
      
      // Handle killfeed logs
      if (lines[i].includes('killed by  with') || lines[i].includes('killed by LandMineTrap')) await HandleKillfeed(this, guild, lines[i]); // Handles explosive deaths
      if (!(i + 1 >= lines.length) && lines[i + 1].includes('killed by') && lines[i].includes('TransportHit')) await HandleKillfeed(this, guild, lines[i]); // Handles vehicle deaths
      if (!(i + 1 >= lines.length) && lines[i + 1].includes('killed by Player') && lines[i].includes('hit by Player')) await HandleKillfeed(this, guild, lines[i]); // Handles regular deaths
      if (lines[i].includes('killed by Player') && !lines[i - 1].includes('hit by Player')) await HandleKillfeed(this, guild, lines[i]); // Handles deaths missing hit by log
    }

    // Handle alarm pings
    const maxEmbed = 10;
    for (const [channel_id, data] of Object.entries(this.alarmPingQueue)) {
      const channel = this.GetChannel(channel_id);
      if (!channel) continue;
      for (const [role, embeds] of Object.entries(data)) {
        let embedArrays = [];
        while (embeds.length > 0) 
          embedArrays.push(embeds.splice(0, maxEmbed))

        for (let i = 0; i < embedArrays.length; i++) {
          if (role == '-no-role-ping-') channel.send({ embeds: embedArrays[i] });
          else channel.send({ content: `<@&${role}>`, embeds: embedArrays[i] });
        }
      }
    }

    this.alarmPingQueue = {};

    const playerTemplate = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
    let previouslyConnected = await this.dbo.collection('players').find({"connected": true}).toArray(); // All players with connection log captured above and no disconnect log
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
          if (!this.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, this.config.Nitrado.ServerID);

          if (!previouslyConnected.includes(playerStat) && this.exists(playerStat.lastDisconnectionDate) && playerStat.lastDisconnectionDate !== null && playerStat.lastDisconnectionDate.getTime() > lastDetectedTime.getTime()) continue;  // Skip this player if the lastDisconnectionDate time is later than the player log entry.

          // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
          if (this.playerSessions.has(info.playerID)) {
            // Player is already in a session, update the session's end time.
            const session = this.playerSessions.get(info.playerID);
            session.endTime = lastDetectedTime; // Update end time.
          } else {
            // Player is not in a session, create a new session.
            const newSession = {
              startTime: lastDetectedTime,
              endTime: null, // Initialize end time as null.
            };
            this.playerSessions.set(info.playerID, newSession);

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

    history.lastLog = lines[lines.length - 1];

    // write JSON string to a file
    fs.writeFileSync(logHistoryDir, JSON.stringify(history));
  }

  async logsUpdateTimer(c) {
    if (c.processingLogs) return; // Process is already running, wait till next scheduled time.
    c.processingLogs = true;
    let t = new Date();
    // c.log(`...Logs Tick - ${t.getHours()}:${t.getMinutes()}:${t.getSeconds()}...`);
    c.activePlayersTick++;

    const settings = await FetchServerSettings(c, "logsUpdateTimer").then(res => res.data.gameserver);

    if (settings == 1) {
      c.error('...Failed to Fetch Server Settings to download Nitrado Logs...');
      return;
    }

    const filename = settings.game_specific.log_files.sort((a, b) => a.length - b.length)[0];
    const path = `${settings.game_specific.path.slice(0, -1)}${filename.split(settings.game)[1]}`;

    // Ensure Player List is logged for next update
    const playerListEnabled = parseInt(settings.settings.config.adminLogPlayerList)
    if (!playerListEnabled) PostServerSettings(this, "config", "adminLogPlayerList", '1')

    let guild = await GetGuild(c, c.config.GuildID);

    await DownloadNitradoFile(c, path, './logs/server-logs.ADM').then(async (status) => {
      if (status == 1) return c.error('...Failed to Download logs...');
      // c.log('...Downloaded logs...');
      await c.readLogs(guild).then(async () => {
        // c.log('...Analyzed logs...');
        HandleExpiredUAVs(c, guild);
        HandleEvents(c, guild)
        if (c.activePlayersTick == 12) await HandleActivePlayersList(c, guild);
      })
    });
    c.processingLogs = false;
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
      let db = (mongoURI.includes("@") ? mongoURI.split("@")[1] : mongoURI.split("//")[1]).endsWith("/") ? mongoURI.slice(0, -1) : mongoURI;
      this.error(`Failed to connect to mongodb (mongodb://${db}/${dbo}): attempt ${databaselogs.attempts} - ${err}`);
      failed = true;
    }

    // write JSON string to a file
    fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

    if (failed) process.exit(-1);
  }

  async autoRestartInit() {
    // Wait for MongoDB to connect
    await this.connectMongo(this.config.mongoURI, this.config.dbo);

    let is_enabled = undefined;
    if (this.databaseConnected) is_enabled = await this.dbo.collection("guilds").findOne({ "server.autoRestart": 1 }).then(is_enabled => is_enabled);

    if (is_enabled) {
      this.log('Starting periodic Nitrado server status check.');
      this.arIntervalId = setInterval(CheckServerStatus, this.arInterval, this);
    }
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
    this.guilds.cache.forEach((guild) => RegisterGuildCommands(this, guild.id));
  }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = DayzRBot;
