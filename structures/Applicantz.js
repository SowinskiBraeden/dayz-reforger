const { RegisterGlobalCommands, RegisterGuildCommands} = require("../util/RegisterSlashCommands");
const { Collection, Client, EmbedBuilder, Routes } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { REST } = require('@discordjs/rest');
const mongoose = require('mongoose');
const Logger = require("../util/Logger");
const path = require("path");
const fs = require('fs');

class Applicantz extends Client {

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

    this.LoadCommandsAndInteractionHandlers();
    this.LoadEvents();

    this.Ready = false;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      const start = new Date().getTime();
      if (interaction.type!=3) {
        
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;

        client.log(`Interaction - ${command}`);

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

        let cmd = client.commands.get(command);
        try {
          cmd.SlashCommand.run(this, interaction, args, start); // start is only used in ping / stats command
        } catch (err) {
          this.sendInternalError(err);
        }
      }
    });

    const client = this;
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
      .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThis command has crashed\nContact the Developers\n${this.config.SupportServer}`)
      .setColor(this.config.Colors.Red)
  
    Interaction.send({ embeds: [embed] });
  }

  // Calls register for guild and global commands
  RegisterSlashCommands() {
    RegisterGlobalCommands(this);
    this.guilds.cache.forEach((guild) => RegisterGuildCommands(this, guild.id));
  }

  log(Text) { this.logger.log(Text); }
  error(Text) { this.logger.error(Text); }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = Applicantz;