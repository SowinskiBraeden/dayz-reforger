import { finished } from "stream/promises";
const concat = require("concat-stream"); // convert to import ?
import { Readable } from "stream";
import FormData from "form-data";
import * as fs from "fs";
import isDefined from "../util/Validation";
import {NitradoCredentials, NitradoConfig} from "../database/guild";
import DayZR from "../DayZRBot";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds

export const enum NitradoCredentialStatus {
    FAILED = "FAILED",
    OK     = "OK",
};

/**
 * TODO: I have littered this file with "any" types just to temporarily have no errors after converting from .js to .ts
 * come back and actually go through line by line and clean this whole file
 */

const UploadNitradoFile = async (
    nitradoCred:    NitradoCredentials,
    client:         DayZR, 
    remoteDir:      string, 
    remoteFilename: string, 
    localFileDir:   string) => 
                                    {
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers/file_server/upload?` 
                            + new URLSearchParams({
                path: remoteDir,
                file: remoteFilename
            }), {
                method: "POST",
                headers: 
                {
                    "Authorization": nitradoCred.Auth
                },
            }).then(response => response.json());

            let contents = fs.readFileSync(localFileDir, "utf8");

            const uploadRes = await fetch(res.data.token.url, 
            {
                method: "POST",
                headers: 
                {
                    "Content-Type": "application/binary",
                    token: res.data.token.token
                },
                body: contents,
            })
            if (!uploadRes.ok) 
            {
                client.error(`Failed to upload file to Nitrado (${nitradoCred.ServerID}): status: ${uploadRes.status}, message: ${res.statusText}: UploadNitradoFile`);
                if (retries === 2) return 1; // Return error status on the second failed status code.
            } 
            else 
            {
                return uploadRes;
            }
        } 
        catch (error: any) 
        {
            client.error(`UploadNitradoFile: Error connecting to server (${nitradoCred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`UploadNitradoFile: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
}

const HandlePlayerBan = async (
    nitradoCred: any, 
    client:       any, 
    gamertag:     any, 
    ban:          any
): Promise<number> => 
{
    const data = await FetchServerSettings(nitradoCred, client, "HandlePlayerBan");  // Fetch server status

    if (data && data != 1) 
    {
        let bans = data.data.gameserver.settings.general.bans;
        if (ban) bans += `\r\n${gamertag}`;
        else if (!ban) bans = bans.replace(gamertag, "");
        else client.error("Incorrect Ban Option: HandlePlayerBan");

        let category = "general";
        let key = "bans";
        return await PostServerSettings(nitradoCred, client, category, key, bans);  // returns 1 (failed) or 0 (not failed)
    }

    //Satisfy the promise
    return -1;
}

const GetRemoteDir = async (
    nitradoCred: any, 
    client: any, dir = ""
): Promise<number | any> => 
    {
    const dirParam = isDefined(dir) ? `?dir=${dir}` : "";
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers/file_server/list${dirParam}`, {
                headers: 
                {
                    "Authorization": nitradoCred.Auth
                }
            }).then(response =>
                response.json().then(data => data)
            ).then(res => res);

            if (res.status === "error") return 1;

            return res.data.entries;
        } 
        catch (error) 
        {
            client.error(`GetRemoteDir: Error connecting to server (${nitradoCred.ServerID}): ${error}`);
            if (retries == MAX_RETRIES) 
            {
                client.error(`GetRemoteDir: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }

    //Satisfy promise
    return -1;
}

/*** exported function ***/
export const DownloadNitradoFile = async (
    nitradoCred: any, 
    client:       any, 
    filename:     any, 
    outputDir:    any
): Promise<number> => 
{
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers/file_server/download?file=${filename}`, {
                headers: 
                {
                    "Authorization": nitradoCred.Auth
                }
            }).then(response =>
                response.json().then(data => data)
            ).then(res => res);

            const stream: any = fs.createWriteStream(outputDir);
            if (!res.data || !res.data.token) 
            {
                client.error(`Error downloading File "${filename}": message: ${res.message}: DownloadNitradoFile`);
                return 1;
            }
            const { body }: any = await fetch(res.data.token.url);
            await finished(Readable.fromWeb(body).pipe(stream));
            return 0;
        } 
        catch (error: any) 
        {
            client.error(`DownloadNitradoFile: Error connecting to server (${nitradoCred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`DownloadNitradoFile: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }

    //This is to satisfy the promise as it needs a number 
    // if somehow it gets past the try catch
    return -1;
};

/*
    Export explicit function names; i.e BanPlayer() & UnbanPlayer() 
    that call to the private parent function HandlePlayerBan() 
    rather than write two whole different functions for each.
*/

export const BanPlayer = async (
    nitradoCred: any, 
    client:       any, 
    gamertag:     any
    ): Promise<number> => await HandlePlayerBan(nitradoCred, client, gamertag, true);

export const UnbanPlayer = async (
    nitradoCred: any, 
    client:       any, 
    gamertag:     any) => await HandlePlayerBan(nitradoCred, client, gamertag, false);

export const RestartServer = async (
    nitradoCred: any, 
    client: any, 
    restart_message: any, 
    message: any) => 
    {
    const params = 
    {
        restart_message: restart_message,
        message: message
    };
    for (let retries = 0; retries < MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers/restart`, 
            {
                method: "POST",
                headers: 
                {
                    "Authorization": nitradoCred.Auth,
                },
                body: JSON.stringify(params)
            });

            if (!res.ok) 
            {
                client.error(`Failed to restart Nitrado server (${nitradoCred.ServerID}): status: ${res.status}, message: ${res.statusText}: RestartServer`);
                return 1; // Return error status on failed status code.
            } 
            else 
            {
                return 0;
            }
        } 
        catch (error: any) 
        {
            client.error(`RestartServer: Error connecting to server (${nitradoCred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`RestartServer: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }

    //This is to satisfy the promise as it needs a number 
    // if somehow it gets past the try catch
    return -1;
};

export const FetchServerSettings = async (
    nitradoCred: any, 
    client:       any, 
    fetcher:      any) => 
{
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            // get current status
            const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers`, 
            {
                headers: 
                {
                    "Authorization": nitradoCred.Auth
                }
            });

            if (!res.ok) 
            {
                client.error(`Failed to get Nitrado server stats (${nitradoCred.ServerID}): status: ${res.status}, message: ${res.statusText}: ${fetcher} via FetchServerSettings`);
                if (res.status == 401) return 1; // return immediately if unauthorized
                if (retries === 2) return 1; // Return error status on the second failed status code.
            } 
            else 
            {
                const data = await res.json();
                return data;
            }
        } 
        catch (error: any) 
        {
            client.error(`${fetcher} via FetchServerSettings: Error connecting to server (${nitradoCred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`${fetcher} via FetchServerSettings: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
};

export const PostServerSettings = async (
    nitradoCred: any, 
    client:       any, 
    category:     any, 
    key:          any, 
    value:        any
): Promise<number> => 
    {
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const formData = new FormData();
            formData.append("category", category);
            formData.append("key", key);
            formData.append("value", value);
            formData.pipe(concat((data: any) => 
            {
                async function postData() 
                {
                    const res = await fetch(`https://api.nitrado.net/services/${nitradoCred.ServerID}/gameservers/settings`, {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            ...formData.getHeaders(),
                            "Authorization": nitradoCred.Auth
                        },
                        body: data,
                    });
                    if (!res.ok) 
                    {
                        client.error(`Failed to get post Nitrado server settings (${nitradoCred.ServerID}): status: ${res.status}, message: ${res.statusText}: PostServerSettings`);
                        if (retries === 2) return 1; // Return error status on the second failed status code.
                    } 
                    else 
                    {
                        const data = await res.json();
                        return data;
                    }
                }
                postData();
            }));
            return 0;
        } 
        catch (error: any) 
        {
            client.error(`PostServerSettings: Error connecting to server (${nitradoCred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`PostServerSettings: Error connecting to server (${nitradoCred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }

    //Return Number to satisfy promise incase try catch not catch
    return -1;
};

export const CheckServerStatus = async (
    nitradoCred: any, 
    client:       any) => 
{
    const data = await FetchServerSettings(nitradoCred, client, "CheckServerStatus");  // Fetch server status

    if (data && data != 1) 
    {
        if (data && data.data.gameserver.status === "stopped") 
        {
            client.log(`Restart of Nitrado server ${nitradoCred.ServerID} has been invoked by the bot,
                                                    the periodic check showed status of "${data.data.gameserver.status}".`);
            // Write optional "restart_message" to set in the Nitrado server logs and send a notice "message" to your server community.
            let restart_message = "Server being restarted by periodic bot check.";
            let message = "The server was restarted by periodic bot check!";

            RestartServer(
                nitradoCred, 
                client, 
                restart_message, message);
        }
    }
};

export const DisableBaseDamage = async (
    nitradoCred: any, 
    client: any, 
    preference: any) => 
    {
    const pref = preference ? "1" : "0";
    const posted = await PostServerSettings(nitradoCred, client, "config", "disableBaseDamage", pref);
    if (posted == 1) return 1;

    const remoteDirs = await GetRemoteDir(nitradoCred, client);
    if (remoteDirs == 1) return 1;
    const basePath = remoteDirs!.filter((dir: any) => dir.type == "dir")[0].path
    const remoteDirsFromBase = await GetRemoteDir(nitradoCred, client, basePath);
    if (remoteDirsFromBase == 1) return 1;
    const missionPath = remoteDirsFromBase[0].path;
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;
    await DownloadNitradoFile(nitradoCred, client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir, "utf-8"));
    gameplay.GeneralData.disableBaseDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(nitradoCred, client, missionPath, "cfggameplay.json", jsonDir);
    if (uploaded == 1) return 1;

    return 0;
};

export const DisableContainerDamage = async (
    nitradoCred: any, 
    client: any, 
    preference: any) => 
{
    const pref = preference ? "1" : "0";
    const posted = await PostServerSettings(
        nitradoCred, 
        client, "config", 
        "disableContainerDamage", 
        pref);

    if (posted == 1) return 1;

    const remoteDirs = await GetRemoteDir(nitradoCred, client);
    if (remoteDirs == 1) return 1;
    const basePath = remoteDirs.filter((dir: any) => dir.type == "dir")[0].path
    const remoteDirsFromBase = await GetRemoteDir(nitradoCred, client, basePath);
    if (remoteDirsFromBase == 1) return 1;
    const missionPath = remoteDirsFromBase[0].path;
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;
    await DownloadNitradoFile(nitradoCred, client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir, "utf-8"));
    gameplay.GeneralData.disableContainerDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(nitradoCred, client, missionPath, "cfggameplay.json", jsonDir);
    if (uploaded == 1) return 1;

    return 0;
};
