const { RegisterGlobalCommands, RegisterGuildCommands} = require("../util/RegisterSlashCommands");
const { Collection, Client, EmbedBuilder, Routes } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { REST } = require('@discordjs/rest');
const Logger = require("../util/Logger");

const path = require("path");
const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const readline = require('readline');

const minute = 60000; // 1 minute in milliseconds

class DayzArmbands extends Client {

  constructor(options, config) {
    super(options)

    this.config = config;
    this.commands = new Collection();
    this.interactionHandlers = new Collection();
    this.logger = new Logger(path.join(__dirname, "..", "logs/Logs.log"));

    if (this.config.Token === "")
    throw new TypeError(
      "The config.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
    );

    this.db;
    this.dbo;
    this.connectMongo(this.config.mongoURI, this.config.dbo);
    this.databaseConnected = false;
    this.LoadCommandsAndInteractionHandlers();
    this.LoadEvents();

    this.Ready = false;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      const start = new Date().getTime();
      if (interaction.type!=3) {
        let GuildDB = await this.GetGuild(interaction.guild_id);

        for (const [factionID, data] of Object.entries(GuildDB.factionArmbands)) {
          const guild = this.guilds.cache.get(GuildDB.serverID);
          const role = guild.roles.cache.find(role => role.id == factionID);
          if (!role) {
            let query = {
              $pull: { 'server.usedArmbands': data.armband },
              $unset: { [`server.factionArmbands.${factionID}`]: "" },
            };
            await this.dbo.collection("guilds").updateOne({'server.serverID': GuildDB.serverID}, query, function (err, res) {
              if (err) return this.sendInternalError(interaction, err);
            });
          }
        }
        
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;

        client.log(`Interaction - ${command}`);

        //Easy to send respnose so ;)
        interaction.guild = await this.guilds.fetch(interaction.guild_id);
        interaction.send = async (message) => {
          const rest = new REST({ version: '10' }).setToken(client.config.Token);

          return await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
            body: {
              type: 4,
              data: message,
            }
          });
        };

        if (!this.databaseConnected) {
          let dbFailedEmbed = new EmbedBuilder()
            .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThe bot has failed to connect to the database 5 times!\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
            .setColor(this.config.Colors.Red)
        
          return interaction.send({ embeds: [dbFailedEmbed] });
        }

        let cmd = client.commands.get(command);
        try {
          cmd.SlashCommand.run(this, interaction, args, { GuildDB }, start); // start is only used in ping / stats command
        } catch (err) {
          this.sendInternalError(err);
        }
      }
    });

    const client = this;
  }

  async updateLogs() {
    const res = await fetch(`https://api.nitrado.net/services/${this.config.Nitrado.ServerID}/gameservers/file_server/download?file=/games/${this.config.Nitrado.UserID}/noftp/dayzxb/config/DayZServer_X1_x64.ADM`, {
      headers: {
        "Authorization": this.config.Nitrado.Auth
      }
    }).then(response => 
      response.json().then(data => data)
    ).then(res => res);

    const stream = fs.createWriteStream('./logs/server-logs.ADM');
    const { body } = await fetch(res.data.token.url);
    await finished(Readable.fromWeb(body).pipe(stream));
  
  }
  
  async handleKillfeed(guildId, line) {
    
    let guild = await this.GetGuild(guildId);
    if (guild.playerstats == undefined) guild.playerstats = [];
    const channel = this.channels.cache.get(guild.killfeedChannel);
    let template = /(.*) \| Player \"(.*)\" \(DEAD\) \(id=(.*) pos=<(.*)>\)\[HP\: 0\] hit by Player \"(.*)\" \(id=(.*) pos=<(.*)>\) into (.*) for (.*) damage \((.*)\) with (.*) from (.*) meters /g;
    let data = [...line.matchAll(template)][0];

    let info = {
      time: data[1],
      victim: data[2],
      victimID: data[3],
      victimPOS: data[4],
      killer: data[5],
      killerID: data[6],
      killerPOS: data[7],
      bodyPart: data[8],
      damage: data[9],
      bullet: data[10],
      weapon: data[11],
      distance: data[12]
    };

    let killerStat = guild.playerstats.find(stat => stat.playerID == info.killerID)
    let victimStat = guild.playerstats.find(stat => stat.playerID == info.victimID)
    let killerStatIndex = guild.playerstats.indexOf(killerStat);
    let victimStatIndex = guild.playerstats.indexOf(victimStat);
    if (killerStat == undefined) killerStat = this.getDefaultPlayerStats(info.killer, info.killerID);
    if (victimStat == undefined) victimStat = this.getDefaultPlayerStats(info.victim, info.victimID);

    killerStat.kills++;
    killerStat.killStreak++;
    killerStat.bestKillStreak = killerStat.killStreak > killerStat.bestKillStreak ? killerStat.killStreak : killerStat.bestKillStreak;
    victimStat.deaths++;
    victimStat.deathStreak++;
    victimStat.worstDeathStreak = victimStat.deathStreak > victimStat.worstDeathStreak ? victimStat.deathStreak : victimStat.bestKillStreak;
    killerStat.KDR = killerStat.kills / (killerStat.deaths == 0 ? 1 : killerStat.deaths); // prevent division by 0
    victimStat.KDR = victimStat.kills / (victimStat.deaths == 0 ? 1 : victimStat.deaths); // prevent division by 0
    if (victimStat.killStreak>0) victimStat.killStreak = 0;
    if (killerStat.deathStreak>0) killerStat.deathStreak = 0;

    if (killerStatIndex == -1) guild.playerstats.push(killerStat);
    else guild.playerstats[killerStatIndex] = killerStat;
    if (victimStatIndex == -1) guild.playerstats.push(victimStat);
    else guild.playerstats[victimStatIndex] = victimStat;

    this.dbo.collection("guilds").updateOne({ "server.serverID": guild.serverID }, {
      $set: {
        "server.playerstats": guild.playerstats
      }
    }, function (err, res) {
      if (err && this.exists(channel)) return this.sendInternalError(channel, err);
    });
    
    let today = new Date();
    let newDt = new Date(`${today.toLocaleDateString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} ${info.time} EST`)
    let unixTime = Math.floor(newDt.getTime()/1000);

    const killEvent = new EmbedBuilder()
        .setColor(this.config.Colors.Default)
        .setDescription(`**Kill Event** - <t:${unixTime}>\n**${info.killer}** killed **${info.victim}**\n> **__Kill Data__**\n> **Weapon:** \` ${info.weapon} \`\n> **Distance:** \` ${info.distance} \`\n> **Body Part:** \` ${info.bodyPart.split('(')[0]} \`\n> **Damage:** \` ${info.damage} \`\n **Killer\n${killerStat.KDR} K/D - ${killerStat.kills} Kills - Killstreak: ${killerStat.killStreak}\nVictim\n${victimStat.KDR} K/D - ${victimStat.deaths} Deaths - Deathstreak: ${victimStat.deathStreak}**`);

    if (this.exists(channel)) channel.send({ embeds: [killEvent] });
  }

  async handleAlarms(guildId, data) {
    let guild = await this.GetGuild(guildId);
    
    if (!this.exists(guild.alarms)) {
      guild.alarms = [];
      this.dbo.collection("guilds").updateOne({ 'server.serverID': guildId }, {
        $set: {
          'server.alarms': [],
        }
      }, function (err, res) {
        if (err) this.error(err);
      });
    }

    for (let i = 0; i < guild.alarms.length; i++) {
      let alarm = guild.alarms[i];
      if (alarm.disabled) continue; // ignore if alarm is disabled due to emp

      if (alarm.ignoredPlayers.includes(data.playerID)) continue;

      let diff = [Math.round(alarm.origin[0] - data.pos[0]), Math.round(alarm.origin[1] - data.pos[1])];
      let distance = Math.sqrt(Math.pow(diff[0], 2) + Math.pow(diff[1], 2)).toFixed(2)

      if (distance < alarm.radius) {
        const channel = this.channels.cache.get(alarm.channel);
        
        let today = new Date();
        let newDt = new Date(`${today.toLocaleDateString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} ${data.time} EST`);
        let unixTime = Math.floor(newDt.getTime()/1000);

        let alarmEmbed = new EmbedBuilder()
          .setColor(this.config.Colors.Default)
          .setDescription(`**Zone Ping - <t:${unixTime}>**\n**${data.player}** was located within **${distance} meters** of the Zone **${alarm.name}**`)
          .addFields({ name: '**Location**', value: `**[${data.pos[0]}, ${data.pos[1]}](https://www.izurvive.com/chernarusplussatmap/#location=${data.pos[0]};${data.pos[1]})**`, inline: false })
      
        channel.send({ content: `<@&${alarm.role}>`, embeds: [alarmEmbed] });
        break; // we break because no need to check if they are in two alarms at once, can't be in two places at once.
      }
    }
  }

  async sendConnectionLogs(guildId, data) {
    
    let guild = await this.GetGuild(guildId);
    if (!this.exists(guild.connectionLogsChannel)) return;
    const channel = this.channels.cache.get(guild.connectionLogsChannel);

    let today = new Date();
    let newDt = new Date(`${today.toLocaleDateString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} ${data.time} EST`);
    let unixTime = Math.floor(newDt.getTime()/1000);

    let connectionLog = new EmbedBuilder()
      .setColor(data.connected ? this.config.Colors.Green : this.config.Colors.Red)
      .setDescription(`**${data.connected ? 'Connect' : 'Disconnect'} Event - <t:${unixTime}>\n${data.player} ${data.connected ? 'Connected' : 'Disconnected'}**`);

    if (!data.connected) {
      if (!data.lastConnectionDate == null) {
        let oldUnixTime = Math.floor(data.lastConnectionDate.getTime()/1000);
        let sessionTime = this.secondsToDhms(unixTime - oldUnixTime);
        connectionLog.addFields({ name: '**Session Time**', value: `**${sessionTime}**`, inline: false });
      } else connectionLog.addFields({ name: '**Session Time**', value: `**Unknown**`, inline: false });
    }

    if (this.exists(channel)) channel.send({ embeds: [connectionLog] });
  }

  async handlePlayerLogs(guildId, line) {

    let guild = await this.GetGuild(guildId);
    if (guild.playerstats == undefined) guild.playerstats = [];

    const connectTemplate = /(.*) \| Player \"(.*)\" is connected \(id=(.*)\)/g;
    const disconnectTemplate = /(.*) \| Player \"(.*)\"\(id=(.*)\) has been disconnected/g;
    const positionTemplate = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;

    if (line.includes('connected')) {
      let data = [...line.matchAll(connectTemplate)][0];

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        connected: true,
      };

      let playerStat = guild.playerstats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = guild.playerstats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = this.getDefaultPlayerStats(info.player, info.playerID);
      
      let today = new Date();
      let newDt = new Date(`${today.toLocaleDateString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()} ${info.time} EST`);
      
      playerStat.lastConnectionDate = newDt;
      playerStat.connected = true;

      if (playerStatIndex == -1) guild.playerstats.push(playerStat);
      else guild.playerstats[playerStatIndex] = playerStat;

      this.dbo.collection("guilds").updateOne({ "server.serverID": guildId }, {
        $set: {
          "server.playerstats": guild.playerstats
        }
      }, function (err, res) {
        if (err) this.error(err);
      });

      this.sendConnectionLogs(guildId, {
        time: info.time,
        player: info.player,
        connected: info.connected,
        lastConnectionDate: null,
      });
    }

    if (line.includes('disconnected')) {
      let data = [...line.matchAll(disconnectTemplate)][0];

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        connected: false
      }

      let playerStat = guild.playerstats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = guild.playerstats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = this.getDefaultPlayerStats(info.player, info.playerID);
      
      playerStat.connected = false;

      if (playerStatIndex == -1) guild.playerstats.push(playerStat);
      else guild.playerstats[playerStatIndex] = playerStat;

      this.dbo.collection("guilds").updateOne({ "server.serverID": guildId }, {
        $set: {
          "server.playerstats": guild.playerstats
        }
      }, function (err, res) {
        if (err) this.error(err);
      });

      this.sendConnectionLogs(guildId, {
        time: info.time,
        player: info.player,
        conected: info.connected,
        lastConnectionDate: playerStat.lastConnectionDate,
      });
    }

    if (line.includes('pos=<')) {
      let data = [...line.matchAll(positionTemplate)][0];

      let info = {
        time: data[1],
        player: data[2],
        playerID: data[3],
        pos: data[4].split(', ').map(v => parseFloat(v)).pop()
      };

      let playerStat = guild.playerstats.find(stat => stat.playerID == info.playerID)
      let playerStatIndex = guild.playerstats.indexOf(playerStat);
      if (playerStat == undefined) playerStat = this.getDefaultPlayerStats(info.player, info.playerID);
      
      playerStat.pos = info.pos;

      this.handleAlarms(guildId, {
        time: info.time,
        player: info.player,
        playerID: info.playerID,
        pos: info.pos,
      });

      if (playerStatIndex == -1) guild.playerstats.push(playerStat);
      else guild.playerstats[playerStatIndex] = playerStat;

      this.dbo.collection("guilds").updateOne({ "server.serverID": guildId }, {
        $set: {
          "server.playerstats": guild.playerstats
        }
      }, function (err, res) {
        if (err) this.error(err);
      });
    }
  }

  async readLogs() {
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
    
    for (let i = lines.indexOf(history.lastLog) + 1; i < lines.length; i++) {
      if (lines[i].includes('connected') || lines[i].includes('disconnected') || lines[i].includes('pos=<')) this.handlePlayerLogs(guildId, lines[i]);
      if (!(i + 1 >= lines.length) && lines[i + 1].includes('killed by Player')) this.handleKillfeed(guildId, lines[i]);
    }

    history.lastLog = lines[lines.length-1];

    // write JSON string to a file
    await fs.writeFileSync(logHistoryDir, JSON.stringify(history));
  }

  async logsUpdateTimer() {
    setTimeout(async () => {
      this.readLogs('992982520591294524');
      // await this.updateLogs().then(() => {
      //   this.guilds.cache.forEach((guild) => {
      //     this.killfeed(guild.id); // Check logs for killfeed
      //     // this.alarms(); // check for base alarms (+ rules that may apply such as safe zone)
      //     // this.adminLogs(); // check for combat logs / connect + deconnect events
      //   });
      // });
      this.logsUpdateTimer(); // restart this function
    }, minute * 5); // restart every 5 minutes
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
      this.db = await MongoClient.connect(mongoURI, {connectTimeoutMS: 1000});
      this.dbo = this.db.db(dbo);
      this.log('Successfully connected to mongoDB');
      databaselogs.connected = true;
      databaselogs.attempts = 0; // reset attempts
      this.databaseConnected = true;
    } catch (err) {
      databaselogs.attempts++;
      this.error(`Failed to connect to mongodb: attempt ${databaselogs.attempts}`);
      failed = true;
    }

    // write JSON string to a file
    await fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

    if (failed) process.exit(-1);
  }

  exists(n) {return null != n && undefined != n && "" != n}

  secondsToDhms(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
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
          const event = require(EventsDir + "/" + file);;
          if (file.split(".")[0] == 'interactionCreate') this.on(file.split(".")[0], i => event(this, i));
          else this.on(file.split(".")[0], event.bind(null, this));
          this.logger.log("Event Loaded: " + file.split(".")[0]);
        });
    });
  }

  sendError(Channel, Error) {
    let embed = new EmbedBuilder()
      .setColor(this.config.Red)
      .setDescription(Error);

    Channel.send(embed);
  }

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

  getDefaultSettings(GuildId) {
    return {
      serverID: GuildId,
      allowedChannels: [],
      killfeedChannel: "",
      connectionLogsChannel: "",
      factionArmbands: {},
      usedArmbands: [],
      excludedRoles: [],
      botAdminRoles: [],
      playerstats: [],
      alarms: [],
    }
  }

  getDefaultPlayerStats(gt, pID) {
    return {
      gamertag: gt,
      playerID: pID,
      KDR: 0.00,
      kills: 0,
      deaths: 0,
      killStreak: 0,
      bestKillStreak: 0,
      deathStreak: 0,
      worstDeathStreak: 0,
      pos: [],
      lastConnectionDate: null,
      connected: false,
    }
  }

  async GetGuild(GuildId) {
    let guild = undefined;
    if (this.databaseConnected) guild = await this.dbo.collection("guilds").findOne({"server.serverID":GuildId}).then(guild => guild);

    // If guild not found, generate guild default
    if (!guild) {
      guild = {}
      guild.server = this.getDefaultSettings(GuildId);
      if (this.databaseConnected) {
        this.dbo.collection("guilds").insertOne(guild, function(err, res) {
          if (err) throw err;
        });
      }
    }

    return {
      serverID: GuildId,
      customChannelStatus: guild.server.allowedChannels.length > 0 ? true : false,
      allowedChannels: guild.server.allowedChannels,
      factionArmbands: guild.server.factionArmbands,
      usedArmbands: guild.server.usedArmbands,
      excludedRoles: guild.server.excludedRoles,
      hasBotAdmin: guild.server.botAdminRoles.length > 0 ? true : false,
      botAdminRoles: guild.server.botAdminRoles,
      playerstats: guild.server.playerstats,
      alarms: guild.server.alarms,
    };
  }

  log(Text) { this.logger.log(Text); }
  error(Text) { this.logger.error(Text); }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = DayzArmbands;