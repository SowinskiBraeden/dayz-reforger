import { ChatInputCommandInteraction } from "discord.js";
import { weapons, AllWeapons }   from "./weapons";
import { Snowflake } from "discord.js";
import { Position }  from "./destinations"
import DayZR         from "../DayZRBot";

// Creates a copy of an object to prevent mutation of parent (i.e BodyParts, createWeaponsObject)
const copy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

interface BodyPartStats
{
    Head:     number;
    Torso:    number;
    RightArm: number;
    LeftArm:  number;
    RightLeg: number;
    LeftLeg:  number;
}

interface IndividualWeaponStats
{
    kills:                  number;
    deaths:                 number;
    shotsLanded:            number;
    timesShot:              number;
    shotsLandedPerBodyPart: BodyPartStats;
    timesShotPerBodyPart:    BodyPartStats;
}

const DefaultBodyPartStats: BodyPartStats =
{
    Head: 0,
    Torso: 0,
    RightArm: 0,
    LeftArm: 0,
    RightLeg: 0,
    LeftLeg: 0,
};

interface WeaponStats
{
    [weaponName: string]: IndividualWeaponStats;
}

const createWeaponsObject = (defaultWeaponStats: IndividualWeaponStats): WeaponStats => 
{
    const defaultWeapons: WeaponStats = {};
    for (const [_, weaponNames] of Object.entries(weapons)) {
        for (const [name, _] of Object.entries(weaponNames)) {
            defaultWeapons[name] = defaultWeaponStats;
        }
    }
    return copy(defaultWeapons);
};

export interface Player
{
    // Identifiers
    gamertag:               string,
    playerID:               string,
    discordID:              Snowflake,
    nitradoServerID:        string,

    // General PVP Stats
    KDR:                    number,
    kills:                  number,
    deaths:                 number,
    killStreak:             number,
    bestKillStreak:         number,
    longestKill:            number,
    deathStreak:            number,
    worstDeathStreak:       number,

    // In depth PVP Stats
    shotsLanded:            number,
    timesShot:              number,
    shotsLandedPerBodyPart: BodyPartStats,
    timesShotPerBodyPart:   BodyPartStats,
    weaponStats:            WeaponStats,
    combatRating:           number,
    highestCombatRating:    number,
    lowestCombatRating:     number,
    combatRatingHistory:    Array<number>,

    // General Session Data
    lastConnectionDate:     Date | null,
    lastDisconnectionDate:  Date | null,
    lastDamageDate:         Date | null,
    lastDeathDate:          Date | null,
    lastHitBy:              string | null,
    connected:              boolean,
    pos:                    Position,
    lastPos:                Position,
    time:                   string | null,
    lastTime:               string | null,

    // Session Stats
    totalSessionTime:       number,
    lastSessionTime:        number,
    longestSessionTime:     number,
    connections:            number,

    // Other
    bounties:               Array<any>, // TODO, define bounty object
    bountiesLength:         number,
}

export const UpdatePlayer = async(
    client: DayZR, 
    player: Player, 
    interaction: ChatInputCommandInteraction | null = null
): Promise<void> =>
{
    /* Wrapping this function in a promise solves some bugs */
    return new Promise(resolve => {
        client.dbo.collection("players").updateOne(
            { "playerID": player.playerID },
            { $set: { ...player } },
            { upsert: true }, // Create player stat document if it does not exist
            (err: string) => {
                if (err)
                {
                    if (interaction == null) return client.error(`UpdatePlayer Error: ${err}`);
                    else return client.sendInternalError(interaction, `UpdatePlayer Error: ${err}`);
                } else resolve();
            }
        );
    });
};

// TODO: fix magic NUMBERS!!!
export const getDefaultPlayer = (
    gamertag:        string, 
    playerId:        string, 
    nitradoServerId: string
): Player =>
{
    return {
        // Identifiers
        gamertag:                   gamertag,
        playerID:                   playerId,
        discordID:                  "",
        nitradoServerID:            nitradoServerId,

        // General PVP Stats
        KDR:                        0.00,
        kills:                      0,
        deaths:                     0,
        killStreak:                 0,
        bestKillStreak:             0,
        longestKill:                0,
        deathStreak:                0,
        worstDeathStreak:           0,

        // In depth PVP Stats
        shotsLanded:                0,
        timesShot:                  0,
        shotsLandedPerBodyPart:     copy(DefaultBodyPartStats),
        timesShotPerBodyPart:       copy(DefaultBodyPartStats),
        weaponStats:                createWeaponsObject({
            kills:                  0,
            deaths:                 0,
            shotsLanded:            0,
            timesShot:              0,
            shotsLandedPerBodyPart: copy(DefaultBodyPartStats),
            timesShotPerBodyPart:   copy(DefaultBodyPartStats),
        }),
        combatRating:               800,
        highestCombatRating:        800,
        lowestCombatRating:         800,
        combatRatingHistory:        [ 800 ],

        // General Session Data
        lastConnectionDate:         null,
        lastDisconnectionDate:      null,
        lastDamageDate:             null,
        lastDeathDate:              null,
        lastHitBy:                  null,
        connected:                  false,
        pos:                        [],
        lastPos:                    [],
        time:                       null,
        lastTime:                   null,

        // Session Stats
        totalSessionTime:           0,
        lastSessionTime:            0,
        longestSessionTime:         0,
        connections:                0,

        // Other
        bounties:                   [],
        bountiesLength:             0,
    }
};

export const insertPVPstats = (player: Player): Player =>
{
    player.shotsLanded            = 0;
    player.timesShot              = 0;
    player.shotsLandedPerBodyPart = copy(DefaultBodyPartStats);
    player.timesShotPerBodyPart   = copy(DefaultBodyPartStats);
    player.weaponStats            = createWeaponsObject(
    {
        kills:                      0,
        deaths:                     0,
        shotsLanded:                0,
        timesShot:                  0,
        shotsLandedPerBodyPart:     copy(DefaultBodyPartStats),
        timesShotPerBodyPart:       copy(DefaultBodyPartStats),
    });
    
    return player;
};

// If a new weapon is not in the existing weaponStats, this will add it.
export const createWeaponStats = (
    player: Player, 
    weapon: AllWeapons
): Player =>
{
    player.weaponStats[weapon] = {
        kills:                  0,
        deaths:                 0,
        shotsLanded:            0,
        timesShot:              0,
        shotsLandedPerBodyPart: copy(DefaultBodyPartStats),
        timesShotPerBodyPart:   copy(DefaultBodyPartStats),
    }

    return player;
};
