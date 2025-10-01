// Node.js built-ins
import * as crypto   from "crypto";
import * as fs       from "node:fs";
import * as path     from "path";
import * as readline from "node:readline";
import { Readable }  from "node:stream";

// Third-party libraries
import {
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  Client,
  ClientOptions,
  Collection,
  EmbedBuilder,
  GatewayDispatchEvents,
  Guild,
  InteractionResponseType,
  InteractionType,
  Message,
  Role,
  Routes,
  Snowflake,
  StringSelectMenuInteraction,
  TextBasedChannel,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { MongoClient } from "mongodb";

// Config
import { Colors, Config } from "./config/config";

// Utilities
import Logger from "./services/Logger";
import { decrypt } from "./util/Cryptic";
import {
  DownloadNitradoFile,
  CheckServerStatus,
  FetchServerSettings,
  PostServerSettings,
  NitradoCredentialStatus,
} from "./services/NitradoAPI";
import { RegisterGlobalCommands, RegisterGuildCommands } from "./services/RegisterSlashCommands";
import { HandlePlayerLogs, HandleActivePlayersList } from "./handlers/LogsHandler";
import { HandleKillfeed, UpdateLastDeathDate } from "./handlers/KillfeedHandler";
import { HandleExpiredUAVs, HandleEvents, PlaceFireplaceInAlarm } from "./handlers/AlarmsHandler";
import { GetWebhook, WebhookSend } from "./services/WebhookService";
import isDefined from "./util/Validation";

// Database
import { Player, UpdatePlayer, getDefaultPlayer } from "./database/player";
import { Missions, MissionKey } from "./database/destinations";
import { GuildConfig, NitradoConfig, GetGuild, NitradoCredentials, IntegerBoolean, GuildConfigDB } from "./database/guild";

const MINUTE                = 60000;  // 1 minute in milliseconds
const AUTO_RESTART_INTERVAL = 600000; // Set auto-restart interval 10 minutes (600,000ms)
const STARTING_PLAYERS_TICK = 11;

// TODO: move this interface to LogsHandler when converted to ts
interface PlayerSession
{
    startTime: Date;
    endTime:   Date | null;
};

// TODO: put this somewhere else
interface CommandOptions
{

};

interface InteractionHandler
{
    run: (
        client: DayZR, 
        interaction: ChatInputCommandInteraction, 
        GuildDB: GuildConfig
    ) => Promise<void>;
}

interface Command
{
    name:        string;
    debug:       boolean;
    global:      boolean;
    description: string;
    usage:       string;
    permissions:
    {
        channel: Array<string>;
        member:  Array<string>;
    };
    options:     Array<CommandOptions>;
    SlashCommand:
    {
        run: (
            client:      DayZR, 
            interaction: ChatInputCommandInteraction, 
            args:        any,    // Unsure of what this should be, come back to later
            GuildDB:     GuildConfig, 
            start?:      number
        ) => Promise<void>;
    };
    Interactions?:
    {
        [InteractoinName: string]: InteractionHandler;
    }
}

/**
 * DayZR extends discord.js Client and contains many
 * important methods that handles concurrent log
 * checking, handling logs, calling utility methods
 * to handle logs, update database, send queued alarms,
 * clean claimed armbands per guild, store player sessions,
 * commands, handlers, interaction handlers, keeping track
 * of where logs have been scanned, server automatic restarts,
 * etc.
 * 
 * @author Braeden Sowinski
 * @version 14.0.0
 */
export default class DayZR extends Client
{

    private config:              Config;
    private logger:              Logger;

    private commands:            Collection<string, Command>;
    private interactionHandlers: Collection<string, InteractionHandler>;

    private key:                 string;
    private encryptionIV:        string;
    private db:                  any;
    public  dbo:                 any;
    public  databaseConnected:   boolean;
    
    private arInterval:          number;
    private arIntervalIds:       Map<string, NodeJS.Timeout>;
    private playerSessions:      Map<string, Map<string, PlayerSession>>;
    private logHistory:          Map<string, string | null>;
    private alarmPingQueue:      Map<string, Map<string, Map<string, Array<EmbedBuilder>>>>;
    private playerListMsgIds:    Map<string, string>;

    private Ready:               boolean;
    private activePlayersTick:   number;
    private timer:               number;

    /**
     * DayZR constructor to create discord Client
     * and initialize maps, determine which guilds
     * have valid Nitrado credentials, setup
     * concurrent log checking for guilds with valid
     * Nitrado credentials.
     * 
     * @param options for discord.js Client
     * @param config  general config for DayZR bot
     */
    public constructor(options: ClientOptions, config: Config)
    {
        super(options);

        this.config              = config;
        this.commands            = new Collection();
        this.interactionHandlers = new Collection();
        this.logger              = new Logger(path.join(__dirname, "..", "logs", "Logs.log"));
        this.timer               = this.config.Dev == "PROD." ? MINUTE * 5 : MINUTE / 4;

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
                "The Dev version in the config.js does not match the allowed cases of \"DEV.\" or \"PROD.\""
            );
        }

        // Generate secret hash with crypto to use for encryption
        this.key = crypto
            .createHash("sha512")
            .update(this.config.SecretKey)
            .digest("hex")
            .substring(0, 32);

        this.encryptionIV = crypto
            .createHash("sha512")
            .update(this.config.SecretIv)
            .digest("hex")
            .substring(0, 16);

        this.databaseConnected = false;
        this.arInterval        = AUTO_RESTART_INTERVAL;
        this.arIntervalIds     = new Map();
        this.playerSessions    = new Map();
        this.logHistory        = new Map();
        this.alarmPingQueue    = new Map();
        this.playerListMsgIds  = new Map();

        this.initialize();
        this.LoadCommandsAndInteractionHandlers();
        this.LoadEvents();

        this.Ready             = false;
        this.activePlayersTick = STARTING_PLAYERS_TICK;

        // Handle Interactions via websocket
        this.ws.on(
            GatewayDispatchEvents.InteractionCreate, 
            async (interaction: ChatInputCommandInteraction) => 
        {

            const start: number = new Date().getTime();

            if (interaction.type != InteractionType.ApplicationCommand) return
            if (!interaction.guildId) return;

            let GuildDB: GuildConfig = await GetGuild(this, interaction.guildId);

            if (isDefined(GuildDB.Nitrado) && isDefined(GuildDB.Nitrado.Auth))
            {
                GuildDB.Nitrado.Auth = decrypt(
                    GuildDB.Nitrado.Auth,
                    this.config.EncryptionMethod,
                    this.key,
                    this.encryptionIV
                );
            }

            const command: string = interaction.commandName;
            const args:    any    = interaction.options;

            // TODO: maybe move this to another method
            // Free unused armbands for related commands
            if (["armbands", "claim", "factions"].includes(command))
            {
                
                for (const [factionID, data] of Object.entries(GuildDB.factionArmbands))
                {

                    const guild: Guild | undefined = this.guilds.cache.get(GuildDB.serverID);

                    if (!guild) continue;

                    const role: Role | undefined = guild.roles.cache.find(role => role.id == factionID);

                    if (!role)
                    {
                        let query = {
                            $pull:  {  "server.usedArmbands": data.armband },
                            $unset: { [`server.factionArmbands.${factionID}`]: "" },
                        };
                    
                        this.dbo.collection("guilds").updateOne(
                            { 
                                "server.serverID": GuildDB.serverID 
                            }, 
                            query, 
                            (err: string) => 
                            {
                                if (err) return this.sendInternalError(interaction, err);
                            }
                        );
                    }
                }
            }

            this.log(`Interaction [${interaction.guildId}] - ${command}`);

            const rest: REST = new REST({ version: "10" }).setToken(this.config.Token);

            // Ensure embeds are properly formatted to send
            const normalizeMessage = (message: any) =>
            {
                if (message?.embeds) {
                    message = {
                    ...message,
                    embeds: message.embeds.map((embed: EmbedBuilder | any) =>
                        embed instanceof EmbedBuilder ? embed.toJSON() : embed
                    ),
                    };
                }
                return message;
            };

            // Easy to send response so ;)
            const handleCallback = async (
                interactionType: InteractionResponseType, 
                message:         any
            ): Promise<unknown> =>
            {
                message = normalizeMessage(message);

                return await rest.post(Routes.interactionCallback(interaction.id, interaction.token),
                {
                    body: {
                        type: interactionType,
                        data: message,
                    }
                });
            }

            // Nicely name our custom callback functions and pass correct type because discord is picky with numbers...
            interaction.send       = async (message: Message): Promise<unknown> => handleCallback(InteractionResponseType.ChannelMessageWithSource, message);
            interaction.deferReply = async (message: Message): Promise<unknown> => handleCallback(InteractionResponseType.DeferredChannelMessageWithSource, message);
            interaction.showModal  = async (message: Message): Promise<unknown> => handleCallback(InteractionResponseType.Modal, message);

            interaction.editReply  = async (message: Message): Promise<unknown> =>
            {
                if (!this.application) return;
                return await rest.patch(Routes.webhookMessage(this.application.id, interaction.token), {
                    body: message,
                });
            };

            if (!this.databaseConnected)
            {
                const dbFailedEmbed: EmbedBuilder = new EmbedBuilder()
                    .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThe bot has failed to connect to the database 5 times!\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
                    .setColor(Colors.Red)

                return interaction.send({ embeds: [dbFailedEmbed] });
            }

            let cmd: Command | undefined = this.commands.get(command);
            if (!cmd) return;

            try
            {
                cmd.SlashCommand.run(this, interaction, args, GuildDB, start); // start is only used in ping / stats command
            } 
            catch (err: any) 
            {
                this.sendInternalError(interaction, err);
            }
        });
    }

    /**
     * log sends given log messages to the logger
     * to print to console and write to file.
     * @param text to send to logger.
     */
    private log(text: string):  void { this.logger.log(text); }

    /**
     * error send a given error message to the logger
     * to print to console and write to file.
     * @param text to send to logger as error.
     */
    public error(text: string): void { this.logger.error(text); }

    /**
     * getDateEST gets proper Date from given nitrado EST time
     * @param time in string format hh:mm:ss
     * @returns Date object at the given time
     */
    public getDateEST(time: string): Date
    {
        // TODO: fix magic numbers <------------------------------------------------------------------------------------
        let timeArray: Array<number> = time.split(" ")[0].split(":").map((v) => parseInt(v));
        let t:         Date          = new Date();                          // Get current date & time (UTC)
        let f:         Date          = new Date(t.getTime() - 4 * 3600000); // Convert UTC into EST time to roll back the day as necessary

        f.setUTCHours(timeArray[0], timeArray[1], timeArray[2]);            // Apply the supplied EST time to the converted date (EST is the timezone produced from the Nitrado logs).
        return new Date(f.getTime() + 4 * 3600000);                         // Add EST time offset to return timestamp in UTC
    }

    /**
     * readLogs of nitrado server from given guild configuration,
     * ensures logs arent read twice. Checks contents of logs and 
     * send to appropriate handler in util/ e.g. HandlePlayerLog, 
     * HandleKillfeed, etc.
     * 
     * After all logs are read, and handlers update db as needed,
     * send any queued alarm pings to configured discord webhooks.
     * Then clear alarm embed queue of given guild.
     * 
     * After alarm queue embeds are handled, any players who are
     * still connected, are checked against logs latest logs
     * player list to ensure they are still connected. If players
     * are no longer connected even while being marked as connected.
     * Mark players as disconnected.
     * 
     * Any players who have been determined to be still connected to
     * server, update their calculated session times. Update players
     * database for connected and previously connected to updated
     * session stats.
     * 
     * Update guild config lastLog read to ensure we continue from
     * where we last left off in the logs when we call readLogs next.
     * 
     * @param guild config to read Nitrado logs
     */
    private async readLogs(guild: GuildConfig): Promise<void>
    {

        if (!guild.Nitrado) return;

        const fileStream: fs.ReadStream = fs.createReadStream(`./logs/${guild.Nitrado.ServerID}-logs.ADM`);

        const rl: readline.Interface = readline.createInterface({
            input: fileStream as Readable,
            crlfDelay: Infinity
        });
        let lines: Array<string> = [];
        for await (const line of rl) { lines.push(line); }

        const lastLog: string | null | undefined = this.logHistory.get(guild.Nitrado.ServerID);

        let logIndex: number = -1;
        if (lastLog != null)
        {
            logIndex = lines.indexOf(lastLog);
        }

        if (this.playerSessions.get(guild.Nitrado.ServerID)?.size === 0)
        {

            // Get all players of this server
            let players: Array<Player> = await this.dbo.collection("players").find(
                { 
                    "nitradoServerID": guild.Nitrado.ServerID 
                }
            ).toArray().then((all: Array<Player>) => 
                {
                    // assume all players who were previously connected are not connected on init only.
                    return all.filter(p => p.connected).map(p => p.connected = false);
                }
            );

            for (let i = 0; i < players.length; i++)
            {
                await UpdatePlayer(this, players[i])
            }
        }

        // Read logs
        for (let i = logIndex + 1; i < lines.length; i++)
        {
            // TODO: tidy this up its just bad looking
        
            // Handle lines to skip
            if (lines[i].includes("| ####")) continue;
            if (lines[i].includes("(id=Unknown") || lines[i].includes("Player \"Unknown Entity\"")) continue;
            if ((i - 1) >= 0 && lines[i] == lines[i - 1]) continue; // continue if this line is a duplicate of the last line

            // Handle general logs
            if (lines[i].includes("connected") || lines[i].includes("pos=<")) await HandlePlayerLogs(guild.Nitrado.ServerID, this, guild, lines[i], guild.combatLogTimer);
            if (lines[i].includes("killed by Zmb") || lines[i].includes(">) died.")) await UpdateLastDeathDate(guild.Nitrado.ServerID, this, lines[i]); // Updates users last death date for non PVP deaths.
            if (lines[i].includes(") placed Fireplace")) await PlaceFireplaceInAlarm(this, guild, lines[i]);

            // Handle killfeed logs
            if (
                (lines[i].includes("killed by  with") || lines[i].includes("killed by LandMineTrap")) || // Handle explosive deaths
                (!(i + 1 >= lines.length) && lines[i + 1].includes("killed by") && lines[i].includes("TransportHit")) || // Handle vehicle deaths
                (!(i + 1 >= lines.length) && lines[i + 1].includes("killed by Player") && lines[i].includes("hit by Player")) || // Handle PVP deaths
                (lines[i].includes("killed by Player") && !lines[i - 1].includes("hit by Player"))                               // Handle deaths missing hit by log
            ) await HandleKillfeed(guild.Nitrado.ServerID, this, guild, lines[i]);
        }

        // Handle alarm pings
        const maxEmbed = 10;

        this.alarmPingQueue.forEach(queue =>
        {
            queue.forEach(async (data, channel_id) =>
            {
                const channel: Channel | undefined = this.GetChannel(channel_id);
                if (!channel) return;

                const NAME:    string = "DayZ.R Zone Alert";
                const webhook: any    = await GetWebhook(this, NAME, channel_id);

                data.forEach(async (embeds, role) =>
                {
                    let embedArrays: Array<Array<EmbedBuilder>> = [];
                    while (embeds.length > 0)
                    {
                        embedArrays.push(embeds.splice(0, maxEmbed));
                    }

                    for (let i = 0; i < embedArrays.length; i++)
                    {
                        interface AlarmEmbed
                        {
                            embeds:   any;
                            content?: string;
                        };

                        let content: AlarmEmbed = { embeds: embedArrays[i] };

                        if (role != "-no-role-ping-") content.content = `<@&${role}>`;
                        WebhookSend(this, webhook, content);

                        // if (role == "-no-role-ping-") channel.send({ embeds: embedArrays[i] });
                        // else channel.send({ content: `<@&${role}>`, embeds: embedArrays[i] });
                    }
                });
            });
        });

        // Clear alarm queue for this guild
        this.alarmPingQueue.set(guild.serverID, new Map());

        // Get all previously connected players from database.
        const playerTemplate = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
        let previouslyConnected = await this.dbo.collection("players").find(
            { 
                "nitradoServerID": guild.Nitrado.ServerID 
            }
        ).toArray().then((players: Array<Player>) => {
            // All players with connection log captured above and no disconnect log
            return players.filter(p => p.connected);
        });

        let lastDetectedTime: Date;

        // Get latest player list from logs
        for (let i = lines.length - 1; i > 0; i--)
        {

            if (lines[i].includes("PlayerList log:"))
            {
            
                for (let j = i + 1; j < lines.length; j++)
                {
                
                    let line: string = lines[j];
                    if (line.includes("| ####")) break;

                    let data = [...line.matchAll(playerTemplate)][0];
                    if (!data) continue;

                    let info = {
                        time: data[1],
                        player: data[2],
                        playerID: data[3],
                    };

                    // Skip this player if the player does not exist.
                    if (!isDefined(info.player) || !isDefined(info.playerID)) continue;

                    lastDetectedTime = this.getDateEST(info.time);

                    let playerStat: Player = await this.dbo.collection("players").findOne({ "playerID": info.playerID });
                    if (!isDefined(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, guild.Nitrado.ServerID);

                    // Skip this player if the lastDisconnectionDate time is later than the player log entry.
                    if (!previouslyConnected.includes(playerStat) && 
                        isDefined(playerStat.lastDisconnectionDate) && 
                        playerStat.lastDisconnectionDate !== null && 
                        playerStat.lastDisconnectionDate.getTime() > lastDetectedTime.getTime()
                    ) continue;


                    // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
                    if (this.playerSessions.get(guild.Nitrado.ServerID)?.has(info.playerID))
                    {
                        
                        // Player is already in a session, update the session's end time.
                        let session: PlayerSession | undefined = this.playerSessions.get(guild.Nitrado.ServerID)?.get(info.playerID);

                        if (!session) continue;

                        session.endTime = lastDetectedTime; // Update end time.
                    } 
                    else 
                    {
                    
                        // Player is not in a session, create a new session.
                        const newSession: PlayerSession = {
                            startTime: lastDetectedTime,
                            endTime: null, // Initialize end time as null.
                        };
                    
                        this.playerSessions.get(guild.Nitrado.ServerID)?.set(info.playerID, newSession);

                        // Check if the player has been marked as connected before, but only if a session doesn't exist
                        // in the map, indicating the connection was discovered in the logs during this session.
                        if (!previouslyConnected.includes(playerStat))
                        {
                            playerStat.connected          = true;
                            playerStat.lastConnectionDate = lastDetectedTime; // Update last connection date.
                        }
                    }

                    await UpdatePlayer(this, playerStat);
                }
                break;
            }
        }

        // Update lastLog read to keep track of progress in logs for next log update
        const lastLine: string = lines[lines.length - 1];
        this.logHistory.set(guild.Nitrado.ServerID, lastLine);
 
        this.dbo.collection("guilds").updateOne(
            { 
                "server.serverID": guild.serverID 
            }, 
            { 
                $set: { "server.lastLog": lastLine } 
            }, 
            (err: string) => 
            {
                if (err)
                {
                    this.error(`Failed to save last log to guild config [${guild.serverID}] for nitrado server [${guild.Nitrado?.ServerID}]`);
                }
            }
        );
    }

    /**
     * logsUpdateTimer handles concurrent log checking and ensures
     * correct log files are downloaded to read.
     * 
     * Go over each guild, for each guild with valid Nitrado credentials,
     * check DayZ mission from Nitrado server settings. Ensure guild config
     * database is up to date for the mission of the server.
     * 
     * Download the correct log file for nitrado server.
     * 
     * After log files are downloaded, call readLogs to read the log file.
     * Once the log files are done being read, call other utility methods
     * to handle expired things such as UAVs, and events.
     * @param c is the DayZR client, passed in from external source
     *          as this function is called externally, and sometimes
     *          "this." just doesnt work.
     */
    private async logsUpdateTimer(c: DayZR): Promise<void>
    {
        c.activePlayersTick++;

        c.guilds.cache.forEach(async (guild) => 
        {
            let GuildDB: GuildConfig = await GetGuild(c, guild.id);

            /*
              Note to self:
              return statements do not prematurely exit out of a forEach loop like it does in a for loop.
            */

            // Continue if no nitrado credentials
            if (!isDefined(GuildDB.Nitrado)) return;

            // Continue if these credentials are marked as failed
            if (GuildDB.Nitrado.Status == NitradoCredentialStatus.FAILED) return; 

            const NitradoCred: NitradoCredentials = {
                ServerID: GuildDB.Nitrado.ServerID,
                UserID:   GuildDB.Nitrado.UserID,
                Auth:     decrypt(
                    GuildDB.Nitrado.Auth,
                    c.config.EncryptionMethod,
                    c.key,
                    c.encryptionIV
                ),
            };

            // TODO: can we type this? will have to read Nitrado API docs
            const response = await FetchServerSettings(NitradoCred, c, "logsUpdateTimer").then(res => res);

            // TODO: fix magic number
            if (response == 1)
            {
                c.dbo.collection("guilds").updateOne(
                    { 
                        "server.serverID": GuildDB.serverID 
                    }, 
                    { 
                        $set: { "Nitrado.Status": NitradoCredentialStatus.FAILED } 
                    }, 
                    (err: string) => 
                    {
                        if (err)
                        {
                            this.error(`Failed to update Nitrado status to failed. [${GuildDB.serverID}]`);
                        }
                    }
                );

                return;
            };

            const settings = response.data.gameserver;

            // Update Nitrado DayZ Mission if change is detected
            let missionKey: MissionKey = settings.settings.config.mission;
            if (GuildDB.Nitrado.Mission !== Missions[missionKey])
            {
                c.dbo.collection("guilds").updateOne(
                    { 
                        "server.serverID": GuildDB.serverID 
                    }, 
                    { 
                        $set: { "Nitrado.Mission": Missions[missionKey] } 
                    }, 
                    (err: string) => 
                    {
                        if (err)
                        {
                            this.error(`Failed to save mission to guild config [${GuildDB.serverID}] for nitrado server [${GuildDB.Nitrado?.ServerID}]`)
                        };
                    }
                );
            }

            GuildDB.Nitrado.Mission = Missions[missionKey];

            // Ignore if no log files on Nitrado server
            if (settings.game_specific.log_files.length == 0) return;

            // Get file with longest file name (target log file)
            const filename: string = settings.game_specific.log_files.sort((a: string, b: string) => a.length - b.length)[0];
            const path:     string = `${settings.game_specific.path.slice(0, -1)}${filename.split(settings.game)[1]}`;

            // Ensure Player List is logged for next update
            const playerListEnabled: IntegerBoolean = parseInt(settings.settings.config.adminLogPlayerList)
            if (!playerListEnabled) PostServerSettings(NitradoCred, c, "config", "adminLogPlayerList", "1")

            await DownloadNitradoFile(NitradoCred, c, path, `./logs/${NitradoCred.ServerID}-logs.ADM`)
                                .then(async (status) =>
            {
                // TODO: magic number
                if (status == 1) return c.error(`Failed to Download Nitrado Log Files - [${NitradoCred.ServerID}]`);
            
                await c.readLogs(GuildDB).then(async () =>
                {
                    HandleExpiredUAVs(c, GuildDB);
                    HandleEvents(c, GuildDB)

                    // TODO: fix magic number
                    if (c.activePlayersTick == 12) await HandleActivePlayersList(NitradoCred, c, GuildDB);
                })
            });
        });
    }

    /**
     * connectMongo connects to mongo database instance, retries on failure
     * up to a maximum number of times. After failed database connection attempts,
     * it marks databaseConnected as false, and allows bot to run.
     * 
     * Any commands called will return error to end-user alerting them
     * the bot has failed to connect to databsae and to contact administrator.
     * 
     * @param mongoURI to connect to
     * @param dbo name of database
     */
    private async connectMongo(mongoURI: string, dbo: string): Promise<void>
    {
    
        let failed:   boolean = false;
        let dbLogDir: string  = path.join(__dirname, "..", "logs", "database-logs.json");

        interface DatabaseLog
        {
            attempts: number;
            connected: boolean;
        };

        let databaselogs: DatabaseLog;

        try
        {
            databaselogs = JSON.parse(
                fs.readFileSync(dbLogDir).toString("utf-8")
            );
        } 
        catch (err) 
        {
            databaselogs = {
                attempts: 0,
                connected: false,
            };
        }

        if (databaselogs.attempts >= 5)
        {
            this.error("Failed to connect to mongodb after multiple attempts");
            return; // prevent further attempts
        }

        try
        {
            // Connect to Mongo database.
            this.db = new MongoClient(mongoURI, { connectTimeoutMS: 1000 });
            await this.db.connect();            
        
            this.dbo = this.db.db(dbo);
            this.log("Successfully connected to mongoDB");
        
            databaselogs.connected = true;
            databaselogs.attempts  = 0; // reset attempts
            this.databaseConnected = true;
        
        } 
        catch (err) 
        {
            databaselogs.attempts++;
            databaselogs.connected = false;
         
            let db: string = mongoURI.includes("@") ? mongoURI.split("@")[1] : mongoURI.split("//")[1];
            db = db.includes("/") ? db.split("/")[0] : db;
         
            this.error(`Failed to connect to mongodb (mongodb://${db}/${dbo}): attempt ${databaselogs.attempts} - ${err}`);
         
            failed = true;
        }

        // write JSON string to a file
        fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

        if (failed) process.exit(-1);
    }

    /**
     * initialize is called once upon the bot being constructed.
     * It attempts to connect the bot to the database, gets guilds
     * from the database to initialize maps.
     * 
     * Checks guilds configurations to see if they should be added
     * to auto-restart map.
     * 
     * Adds each guild with valid Nitrado config to a lastLogs map 
     * to keep a local copy of where logs have been read last.
     * 
     * Adds each guild with valid Nitrado config to player sessions 
     * map to keep track of active players per guilds nitrado server.
     * 
     * Adds each guild with valid Nitrado config to alarm queue map 
     * to keep track of which guilds have embeds to send to select 
     * channels.
     */
    private async initialize(): Promise<void> 
    {
    
        // Wait for MongoDB to connect
        await this.connectMongo(this.config.MongoURI, this.config.DBO);

        if (!this.databaseConnected) return;
        
        let guilds: Array<GuildConfigDB> = await this.dbo.collection("guilds").find({}).toArray();

        /*
          Initialize auto restart for enabled servers
          Initialize last logs
          Initialize Player Sessions
        */
        for (let i = 0; i < guilds.length; i++)
        {
            // // Ignore guilds with no Nitrado configuration
            if (!isDefined(guilds[i].Nitrado)) continue;
            
            if (guilds[i].server.autoRestart) 
            {
                const NitradoCred: NitradoCredentials = {
                    ServerID: guilds[i].Nitrado!.ServerID,
                    UserID: guilds[i].Nitrado!.UserID,
                    Auth: decrypt(
                        guilds[i].Nitrado!.Auth,
                        this.config.EncryptionMethod,
                        this.key,
                        this.encryptionIV
                    )
                };
                this.arIntervalIds.set(guilds[i].server.serverID, setInterval(CheckServerStatus, this.arInterval, NitradoCred, this))
            }
            this.logHistory.set(guilds[i].Nitrado!.ServerID, guilds[i].server.lastLog); // Using Nitrado Server ID over guild ID in case of future support for multiple nitrado servers in a single guild
            this.playerSessions.set(guilds[i].Nitrado!.ServerID, new Map());            // Same reason here as named above.
            this.alarmPingQueue.set(guilds[i].server.serverID, new Map());             // Initialize alarm queue to be empty
            this.playerListMsgIds.set(guilds[i].server.serverID, "");                  // Initialize player list message ids
            this.log(`[${guilds[i].server.serverID}] Initialized existing Nitrado Server: (${guilds[i].Nitrado!.ServerID})`);
        }
    }

    /**
     * initNewNitradoServer takes required Nitrado credentials
     * such as the unique server ID to add guild to required maps 
     * such as log history, player sessions, alarm queue, etc.
     * 
     * @param guildId of the guild the nitrado server is assigned in.
     * @param Nitrado configuration provided for this guild.
     */
    private async initNewNitradoServer(
        guildId: Snowflake, 
        Nitrado: NitradoConfig
    ): Promise<void>
    {
        let guild: GuildConfig = await GetGuild(this, guildId)

        if (guild.autoRestart)
        {
            this.arIntervalIds.set(guildId, setInterval(CheckServerStatus, this.arInterval, Nitrado, this))
        }

        this.logHistory.set(Nitrado.ServerID, guild.lastLog);
        this.playerSessions.set(Nitrado.ServerID, new Map());
        this.alarmPingQueue.set(guildId, new Map());
        this.playerListMsgIds.set(guildId, "");
        this.log(`[${guildId}] Initialized new Nitrado`);
    }

    /**
     * secondsToDhms converts a given number of seconds
     * to its equivilent in days, hours, minutes and seconds.
     * 
     * @param seconds to convert to dhms
     * @returns string of days x, hours y, minutes z, ...
     */
    public secondsToDhms(seconds: number): string
    {

        // TODO; holy magic numbers, my prof is gonna assasinate me if he sees this
        seconds = Number(seconds);
        const d: number = Math.floor(seconds / (3600 * 24));
        const h: number = Math.floor(seconds % (3600 * 24) / 3600);
        const m: number = Math.floor(seconds % 3600 / 60);
        const s: number = Math.floor(seconds % 60);

        const dDisplay: string = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
        const hDisplay: string = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        const mDisplay: string = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        const sDisplay: string = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";

        return dDisplay + hDisplay + mDisplay + sDisplay;
    }

    /**
     * LoadCommandAndInteractoinHandlers checks the commands/
     * directory for each slash command, and maps their provided
     * functions to their given name. As well as interaction
     * handlers for button menues, select menus, etc.
     */
    private LoadCommandsAndInteractionHandlers(): void 
    {
        let CommandsDir: string = path.join(__dirname, "commands");
    
        fs.readdir(CommandsDir, (err, files) =>
        {
            if (err)
            {
                this.error(err.message);
            }
            else
            {
                files.forEach((file) =>
                {
                    let cmd: Command = require(CommandsDir + "/" + file);
                    if (!isDefined(cmd.name) || !isDefined(cmd.description))
                    {
                        return this.error(
                            "Unable to load Command: " +
                            file.split(".")[0] +
                            ", Reason: File doesn't had name/desciption"
                        );
                    }

                    this.commands.set(file.split(".")[0].toLowerCase(), cmd);
                    
                    if (isDefined(cmd.Interactions))
                    {
                        for (let [interaction, handler] of Object.entries(cmd.Interactions))
                        {
                            this.interactionHandlers.set(interaction, handler);
                        }
                    }

                    this.log("Command Loaded: " + file.split(".")[0]);
                });
            }
        });
    }

    /**
     * LoadEvents read events from the events/ directory
     * and maps each event to a webhook listener to ensure
     * we are listening to events we want to keep track of.
     */
    private LoadEvents(): void
    {
        let EventsDir: string = path.join(__dirname, "events");
        
        fs.readdir(EventsDir, (err, files) =>
        {
            if (err)
            {
                this.error(err.message);
            }
            else
            {
                files.forEach((file) =>
                {
                    const event = require(EventsDir + "/" + file);
                   
                    if (["interactionCreate", "guildMemberAdd"].includes(file.split(".")[0]))
                    {
                        this.on(file.split(".")[0], i => event(this, i));
                    }
                    else
                    {
                        this.on(file.split(".")[0], event.bind(null, this));
                    }

                    this.log("Event Loaded: " + file.split(".")[0]);
                });
            }
        });
    }

    /**
     * GetChannel takes a channel id and returns the channel
     * object from discord's client.
     * 
     * @param channel_id to get
     * @returns Channel if found or undefined if not
     */
    public GetChannel(channel_id: Snowflake): Channel | undefined
    { 
        return this.channels.cache.get(channel_id); 
    }

    /**
     * sendError sends an error embed with the given error 
     * message to a discord channel to alert end-users of 
     * an issue.
     * 
     * @param channel to send error to
     * @param error to include in embed
     */
    public sendError(channel: TextBasedChannel, error: string): void
    {
        this.error(error);
        let embed: EmbedBuilder = new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(error);


        channel.send({ embeds: [embed] });
    }

    /**
     * sendInternalError should send errors if an internal error
     * has occuered such as failed database operations, failed
     * interaction handlers, etc.
     * 
     * @param interaction to reply to with error warning
     * @param error to log to internal logs
     */
    public sendInternalError(
        interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction, 
        error:       string
    ): void 
    {
        this.error(error);
        const embed: EmbedBuilder = new EmbedBuilder()
            .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThis command has crashed\nContact the Developers\nhttps://discord.gg/YCXhvy9uZw`)
            .setColor(Colors.Red)

        if (interaction.isChatInputCommand())
        {
            interaction.send({ embeds: [embed] });
        }
        else if (interaction.isButton() || interaction.isStringSelectMenu())
        {
            interaction.update({ embeds: [embed], components: [] });
        }
    }

    /**
     * RegisterSlashCommands registers slash commands
     * loaded earlier from commands/ directory with
     * discords REST API.
     */
    private RegisterSlashCommands(): void
    {
        RegisterGlobalCommands(this);

        let p = Promise.resolve()
        
        this.guilds.cache.forEach((guild) => 
        {
            p = p.then(() => 
            {
                RegisterGuildCommands(this, guild.id);
                return new Promise((resolve) => 
                {
                    setTimeout(resolve, 500); // <<--- TODO: MAGIC NUMBER!
                });
            });
        });
    }

    /**
     * build logs into client once ready
     */
    public build(): void
    {
        this.login(this.config.Token);
    }
}
