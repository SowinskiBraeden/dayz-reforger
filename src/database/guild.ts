import { Snowflake } from "discord.js";
import DayZR from "../DayZRBot";
import { NitradoCredentialStatus } from "@util/NitradoAPI";

export const enum IntegerBoolean {
    FALSE,
    TRUE
};

export interface UAV {
    // TODO: fill this out
};

export interface Alarm {
    // TODO: fill this out
};

export interface NitradoConfig {
    ServerID: string;
    UserID:   string;
    Auth:     string;
    Status:   NitradoCredentialStatus;
};

interface GuildConfigAttributes {
    serverID:              Snowflake;
    lastLog:               string | null;
    serverName:            string;
    autoRestart:           IntegerBoolean;
    showKillfeedCoords:    IntegerBoolean;
    showKillfeedWeapon:    IntegerBoolean;
    purchaseUAV:           IntegerBoolean;
    purchaseEMP:           IntegerBoolean;
    allowedChannels:       Array<Snowflake>;
    customChannelStatus?:  boolean;          // optional - generated outside of DB
    hasBotAdmin?:          boolean;          // optional - generated outside of DB

    killfeedChannel:       Snowflake;
    connectionLogsChannel: Snowflake;
    activePlayersChannel:  Snowflake;
    welcomeChannel:        Snowflake;

    factionArmbands:       any;
    usedArmbands:          Array<string>;
    excludedRoles:         Array<string>;
    hasExcludedRoles?:     boolean;         // optional - generated outside of DB
    botAdminRoles:         Array<Snowflake>;

    alarms:                Array<Alarm>;
    events:                Array<any>;
    uavs:                  Array<UAV>;

    incomeRoles:           Array<Snowflake>;
    incomeLimiter:         number;

    startingBalance:       number;
    uavPrice:              number;
    empPrice:              number;

    linkedGamertagRole:    Snowflake;
    memberRole:            Snowflake;
    adminRole:             Snowflake;

    combatLogTimer:        number;
}

interface GuildConfigDB {
    server: GuildConfigAttributes;
    Nitrado: NitradoConfig | null;
};

// TODO: have better names, i.e. combatLogTimer in seconds or minutes? inclomeLimiter?
// TODO: figure out interface of 

// Also this is so stupid, in the DB all server attributes are under server, 
// while in the code we almost always have the attributes directly in top
// level of object, i.e. guild.startingBalance instead of guild.server.startingBalance
export interface GuildConfig extends GuildConfigAttributes {
    Nitrado: NitradoConfig | null;
}

export async function GetGuild(client: DayZR, GuildId: Snowflake): Promise<GuildConfig>
{
    let guild: GuildConfigDB | null = null;
    if (client.databaseConnected)
    {
        guild = await client.dbo.collection("guilds").findOne(
            { 
                "server.serverID": GuildId 
            }
        ).then((guild: GuildConfigDB) => guild);
    }

    // If guild not found, generate guild default
    if (!guild)
    {
        guild = {
            server: getDefaultSettings(GuildId),
            Nitrado: null,
        };

        if (client.databaseConnected)
        {
            client.dbo.collection("guilds").insertOne(guild, (err: string) => {
                if (err) client.error(`GetGuild Insert Error: ${err}`);
            });
        }
    }

    return {
        serverID:              GuildId,
        Nitrado:               guild.Nitrado,
        lastLog:               guild.server.lastLog,
        serverName:            guild.server.serverName,
        autoRestart:           guild.server.autoRestart,
        showKillfeedCoords:    guild.server.showKillfeedCoords,
        showKillfeedWeapon:    guild.server.showKillfeedWeapon,
        purchaseUAV:           guild.server.purchaseUAV,
        purchaseEMP:           guild.server.purchaseEMP,
        allowedChannels:       guild.server.allowedChannels,
        customChannelStatus:   guild.server.allowedChannels.length > 0,
        hasBotAdmin:           guild.server.botAdminRoles.length > 0,

        killfeedChannel:       guild.server.killfeedChannel,
        connectionLogsChannel: guild.server.connectionLogsChannel,
        activePlayersChannel:  guild.server.activePlayersChannel,
        welcomeChannel:        guild.server.welcomeChannel,

        factionArmbands:       guild.server.factionArmbands,
        usedArmbands:          guild.server.usedArmbands,
        excludedRoles:         guild.server.excludedRoles,
        hasExcludedRoles:      guild.server.excludedRoles.length > 0,
        botAdminRoles:         guild.server.botAdminRoles,

        alarms:                guild.server.alarms,
        events:                guild.server.events,
        uavs:                  guild.server.uavs,

        incomeRoles:           guild.server.incomeRoles,
        incomeLimiter:         guild.server.incomeLimiter,

        startingBalance:       guild.server.startingBalance,
        uavPrice:              guild.server.uavPrice,
        empPrice:              guild.server.empPrice,

        linkedGamertagRole:    guild.server.linkedGamertagRole,
        memberRole:            guild.server.memberRole,
        adminRole:             guild.server.adminRole,

        combatLogTimer:        guild.server.combatLogTimer,
    };
}

export function getDefaultSettings(GuildId: Snowflake): GuildConfigAttributes {
    return {
        serverID:              GuildId,
        lastLog:               null,
        serverName:            "our server!",
        autoRestart:           IntegerBoolean.FALSE,
        showKillfeedCoords:    IntegerBoolean.FALSE,
        showKillfeedWeapon:    IntegerBoolean.FALSE,
        purchaseUAV:           IntegerBoolean.TRUE,   // Allow/Disallow purchase of UAVs
        purchaseEMP:           IntegerBoolean.TRUE,   // Allow/Disallow purchase of EMPs
        allowedChannels:       [],

        killfeedChannel:       "",
        connectionLogsChannel: "",
        activePlayersChannel:  "",
        welcomeChannel:        "",

        factionArmbands:       {},
        usedArmbands:          [],
        excludedRoles:         [],
        botAdminRoles:         [],

        alarms:                [],
        events:                [],
        uavs:                  [],

        incomeRoles:           [],
        incomeLimiter:         168,   // # of hours in 7 days

        startingBalance:       500,
        uavPrice:              50000,
        empPrice:              500000,

        linkedGamertagRole:    "",
        memberRole:            "",
        adminRole:             "",

        combatLogTimer:        5,     // minutes
    };
};
