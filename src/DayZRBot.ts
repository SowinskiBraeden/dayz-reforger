// Discord.js & REST API
import {
    Collection,
    Client,
    EmbedBuilder,
    Routes,
    InteractionResponseType,
    InteractionType,
    GatewayDispatchEvents,
    ClientOptions,
    Guild,
    ChatInputCommandInteraction,
    Snowflake,
    Role,
    Message,
    TextBasedChannel,
    ButtonInteraction,
    StringSelectMenuInteraction,
    Channel,
} from "discord.js";
import { REST } from "@discordjs/rest";

// MongoDB
import { MongoClient } from "mongodb";

// Node.js built-ins
import * as path     from "path";
import * as fs       from "node:fs";
import * as readline from "node:readline";
import * as crypto   from "crypto";
import { Readable }  from "node:stream";

// Custom utilities
import Logger                                            from "./util/Logger";
import { RegisterGlobalCommands, RegisterGuildCommands } from "./util/RegisterSlashCommands";
import {
  DownloadNitradoFile,
  CheckServerStatus,
  FetchServerSettings,
  PostServerSettings,
  NitradoCredentialStatus,
} from "./util/NitradoAPI";
import { HandlePlayerLogs, HandleActivePlayersList } from "./util/LogsHandler";
import { HandleKillfeed, UpdateLastDeathDate } from "./util/KillfeedHandler";
import { HandleExpiredUAVs, HandleEvents, PlaceFireplaceInAlarm } from "./util/AlarmsHandler";
import { decrypt } from "./util/Cryptic";
import { GetWebhook, WebhookSend } from "./util/WebhookHandler";
import { Config, Colors } from "./config/config";

// Database structures
import { getDefaultPlayer, UpdatePlayer, Player } from "./database/player";
import { Missions, MissionKey } from "./database/destinations";
import { GetGuild, GuildConfig, NitradoConfig } from "./database/guild";

const MINUTE = 60000; // 1 minute in milliseconds
const AUTO_RESTART_INTERVAL = 600000; // Set auto-restart interval 10 minutes (600,000ms)
const STARTING_PLAYERS_TICK = 11;

// TODO: move this interface to LogsHandler when converted to ts
interface PlayerSession {
    startTime: Date;
    endTime: Date | null;
};

// TODO: put this somewhere else
interface CommandOptions {

};

interface InteractionHandler {
    run: (
        client: DayZR, 
        interaction: ChatInputCommandInteraction, 
        GuildDB: GuildConfig
    ) => Promise<void>;
}

interface Command {
    name: string;
    debug: boolean;
    global: boolean;
    description: string;
    usage: string;
    permissions: {
        channel: Array<string>;
        member: Array<string>;
    };
    options: Array<CommandOptions>;
    SlashCommand: {
        run: (
            client: DayZR, 
            interaction: ChatInputCommandInteraction, 
            args: any,    // Unsure of what this should be, come back to later
            GuildDB: GuildConfig, 
            start?: number
        ) => Promise<void>;
    };
    Interactions?: {
        [InteractoinName: string]: InteractionHandler;
    }
}

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

    constructor(options: ClientOptions, config: Config)
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

        this.ws.on(
            GatewayDispatchEvents.InteractionCreate, 
            async (interaction: ChatInputCommandInteraction) => 
        {

            const start: number = new Date().getTime();

            if (interaction.type == InteractionType.ApplicationCommand)
            {
                if (!interaction.guildId) return;

                let GuildDB: GuildConfig = await GetGuild(this, interaction.guildId);

                if (this.exists(GuildDB.Nitrado) && this.exists(GuildDB.Nitrado.Auth))
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

                const rest = new REST({ version: "10" }).setToken(this.config.Token);

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
                const handleCallback = async (interactionType: InteractionResponseType, message: any): Promise<unknown> =>
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
                try {
                    cmd.SlashCommand.run(this, interaction, args, GuildDB, start); // start is only used in ping / stats command
                } catch (err: any) {
                    this.sendInternalError(interaction, err);
                }
            }
        });
    }

    private log(text: string):  void { this.logger.log(text); }
    public error(text: string): void { this.logger.error(text); }

    public getDateEST(time: string): Date
    {
        // TODO: fix magic numbers <------------------------------------------------------------------------------------
        let timeArray: Array<number> = time.split(" ")[0].split(":").map((v) => parseInt(v));
        let t:         Date          = new Date();                          // Get current date & time (UTC)
        let f:         Date          = new Date(t.getTime() - 4 * 3600000); // Convert UTC into EST time to roll back the day as necessary

        f.setUTCHours(timeArray[0], timeArray[1], timeArray[2]);            // Apply the supplied EST time to the converted date (EST is the timezone produced from the Nitrado logs).
        return new Date(f.getTime() + 4 * 3600000);                         // Add EST time offset to return timestamp in UTC
    }

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

        let logIndex = -1;
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
                const channel = this.GetChannel(channel_id);
                if (!channel) return;

                const NAME    = "DayZ.R Zone Alert";
                const webhook = await GetWebhook(this, NAME, channel_id);

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

        this.alarmPingQueue.set(guild.serverID, new Map()); // Clear alarm queue for this guild

        const playerTemplate = /(.*) \| Player \"(.*)\" \(id=(.*) pos=<(.*)>\)/g;
        let previouslyConnected = await this.dbo.collection("players").find(
            { 
                "nitradoServerID": guild.Nitrado.ServerID 
            }
        ).toArray().then((players: Array<Player>) => {
            // All players with connection log captured above and no disconnect log
            return players.filter(p => p.connected);
        });

        let lastDetectedTime;

        for (let i = lines.length - 1; i > 0; i--)
        {

            if (lines[i].includes("PlayerList log:"))
            {
            
                for (let j = i + 1; j < lines.length; j++)
                {
                
                    let line = lines[j];
                    if (line.includes("| ####")) break;

                    let data = [...line.matchAll(playerTemplate)][0];
                    if (!data) continue;

                    let info = {
                        time: data[1],
                        player: data[2],
                        playerID: data[3],
                    };

                    // Skip this player if the player does not exist.
                    if (!this.exists(info.player) || !this.exists(info.playerID)) continue;

                    lastDetectedTime = await this.getDateEST(info.time);

                    let playerStat = await this.dbo.collection("players").findOne({ "playerID": info.playerID });
                    if (!this.exists(playerStat)) playerStat = getDefaultPlayer(info.player, info.playerID, guild.Nitrado.ServerID);

                    // Skip this player if the lastDisconnectionDate time is later than the player log entry.
                    if (!previouslyConnected.includes(playerStat) && 
                        this.exists(playerStat.lastDisconnectionDate) && 
                        playerStat.lastDisconnectionDate !== null && 
                        playerStat.lastDisconnectionDate.getTime() > lastDetectedTime.getTime()
                    ) continue;


                    // Track adjusted sessions this instance has handled (e.g. no bot crashes or restarts).
                    if (this.playerSessions.get(guild.Nitrado.ServerID)?.has(info.playerID))
                    {
                        
                        // Player is already in a session, update the session"s end time.
                        let session: PlayerSession | undefined = this.playerSessions.get(guild.Nitrado.ServerID)?.get(info.playerID);

                        if (!session) continue;

                        session.endTime = lastDetectedTime; // Update end time.
                    } 
                    else 
                    {
                    
                        // Player is not in a session, create a new session.
                        const newSession = {
                            startTime: lastDetectedTime,
                            endTime: null, // Initialize end time as null.
                        };
                    
                        this.playerSessions.get(guild.Nitrado.ServerID)?.set(info.playerID, newSession);

                        // Check if the player has been marked as connected before, but only if a session doesn"t exist
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

        const lastLine = lines[lines.length - 1];
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

    private async logsUpdateTimer(c: DayZR): Promise<void>
    {
        c.activePlayersTick++;

        c.guilds.cache.forEach(async (guild) => 
        {
            let GuildDB = await GetGuild(c, guild.id);

            /*
              Note to self:
              return statements do not prematurely exit out of a forEach loop like it does in a for loop.
            */

            // Continue if no nitrado credentials
            if (!c.exists(GuildDB.Nitrado)) return;

            // Continue if these credentials are marked as failed
            if (GuildDB.Nitrado.Status == NitradoCredentialStatus.FAILED) return; 

            const NitradoCred = {
                ServerID: GuildDB.Nitrado.ServerID,
                UserID:   GuildDB.Nitrado.UserID,
                Auth:     decrypt(
                    GuildDB.Nitrado.Auth,
                    c.config.EncryptionMethod,
                    c.key,
                    c.encryptionIV
                ),
            };

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
            const filename = settings.game_specific.log_files.sort((a: string, b: string) => a.length - b.length)[0];
            const path = `${settings.game_specific.path.slice(0, -1)}${filename.split(settings.game)[1]}`;

            // Ensure Player List is logged for next update
            const playerListEnabled = parseInt(settings.settings.config.adminLogPlayerList)
            if (!playerListEnabled) PostServerSettings(NitradoCred, c, "config", "adminLogPlayerList", "1")

            await DownloadNitradoFile(NitradoCred, c, path, `./logs/${NitradoCred.ServerID}-logs.ADM`)
                                .then(async (status) =>
            {
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

    async connectMongo(mongoURI: string, dbo: string): Promise<void>
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
            databaselogs.attempts = 0; // reset attempts
            this.databaseConnected = true;
        
        } 
        catch (err) 
        {
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

    async initialize(): Promise<void> 
    {
    
        // Wait for MongoDB to connect
        await this.connectMongo(this.config.MongoURI, this.config.DBO);

        if (!this.databaseConnected) return;
        
        let guilds = await this.dbo.collection("guilds").find({}).toArray();

        /*
          Initialize auto restart for enabled servers
          Initialize last logs
          Initialize Player Sessions
        */
        for (let i = 0; i < guilds.length; i++)
        {
            if (!this.exists(guilds[i].Nitrado)) continue;
            
            if (guilds[i].server.autoRestart) 
            {
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
            this.alarmPingQueue.set(guilds[i].server.serverID, new Map());             // Initialize alarm queue to be empty
            this.playerListMsgIds.set(guilds[i].server.serverID, "");                  // Initialize player list message ids
            this.log(`[${guilds[i].server.serverID}] Initialized existing Nitrado Server: (${guilds[i].Nitrado.ServerID})`);
        }
    }

    async initNewNitradoServer(
        guildId: Snowflake, 
        Nitrado: NitradoConfig
    ): Promise<void>
    {
        let guild = await GetGuild(this, guildId)

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

    exists<T> (n: T | null | undefined | "" | number): n is T
    {
        return typeof n === "number" ? !isNaN(n) : n !== null && n !== undefined && n !== "";
    }

    secondsToDhms(seconds: number): string
    {

        // TODO; holy magic numbers, my prof is gonna assasinate me if he sees this
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

    LoadCommandsAndInteractionHandlers(): void 
    {
        let CommandsDir = path.join(__dirname, "commands");
    
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
                    if (!this.exists(cmd.name) || !this.exists(cmd.description))
                    {
                        return this.error(
                            "Unable to load Command: " +
                            file.split(".")[0] +
                            ", Reason: File doesn't had name/desciption"
                        );
                    }

                    this.commands.set(file.split(".")[0].toLowerCase(), cmd);
                    
                    if (this.exists(cmd.Interactions))
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

    LoadEvents(): void
    {
        let EventsDir = path.join(__dirname, "events");
        
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

    // Allows shorter lines of code elsewhere
    GetChannel(channel_id: Snowflake): Channel | undefined
    { 
        return this.channels.cache.get(channel_id); 
    }

    sendError(channel: TextBasedChannel, error: string): void
    {
        this.error(error);
        let embed: EmbedBuilder = new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(error);


        channel.send({ embeds: [embed] });
    }

    // Handles internal errors for slash commands. E.g failed to update database from slash command.
    sendInternalError(
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

    // Calls register for guild and global commands
    RegisterSlashCommands(): void
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

    build(): void
    {
        this.login(this.config.Token);
    }
}
