import { finished } from "stream/promises";
const concat = require("concat-stream"); // convert to import ?
import { Readable } from "stream";
import FormData from "form-data";
import * as fs from "fs";
import isDefined from "../util/Validation";

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
    nitrado_cred:   any, 
    client:         any, 
    remoteDir:      any, 
    remoteFilename: any, 
    localFileDir:   any) => 
                                    {
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers/file_server/upload?` 
                            + new URLSearchParams({
                path: remoteDir,
                file: remoteFilename
            }), {
                method: "POST",
                headers: 
                {
                    "Authorization": nitrado_cred.Auth
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
                client.error(`Failed to upload file to Nitrado (${nitrado_cred.ServerID}): status: ${uploadRes.status}, message: ${res.statusText}: UploadNitradoFile`);
                if (retries === 2) return 1; // Return error status on the second failed status code.
            } 
            else 
            {
                return uploadRes;
            }
        } 
        catch (error: any) 
        {
            client.error(`UploadNitradoFile: Error connecting to server (${nitrado_cred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`UploadNitradoFile: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
}

const HandlePlayerBan = async (
    nitrado_cred: any, 
    client:       any, 
    gamertag:     any, 
    ban:          any) => 
{
    const data = await module.exports.FetchServerSettings(nitrado_cred, client, "HandlePlayerBan");  // Fetch server status

    if (data && data != 1) 
    {
        let bans = data.data.gameserver.settings.general.bans;
        if (ban) bans += `\r\n${gamertag}`;
        else if (!ban) bans = bans.replace(gamertag, "");
        else client.error("Incorrect Ban Option: HandlePlayerBan");

        let category = "general";
        let key = "bans";
        return await module.exports.PostServerSettings(nitrado_cred, client, category, key, bans);  // returns 1 (failed) or 0 (not failed)
    }
}

const GetRemoteDir = async (
    nitrado_cred: any, 
    client: any, dir = "") => 
    {
    const dirParam = isDefined(dir) ? `?dir=${dir}` : "";
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers/file_server/list${dirParam}`, {
                headers: 
                {
                    "Authorization": nitrado_cred.Auth
                }
            }).then(response =>
                response.json().then(data => data)
            ).then(res => res);

            if (res.status === "error") return 1;

            return res.data.entries;
        } 
        catch (error) 
        {
            client.error(`GetRemoteDir: Error connecting to server (${nitrado_cred.ServerID}): ${error}`);
            if (retries == MAX_RETRIES) 
            {
                client.error(`GetRemoteDir: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
}

/*** exported function ***/
export const DownloadNitradoFile = async (
    nitrado_cred: any, 
    client:       any, 
    filename:     any, 
    outputDir:    any) => 
{
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers/file_server/download?file=${filename}`, {
                headers: 
                {
                    "Authorization": nitrado_cred.Auth
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
            client.error(`DownloadNitradoFile: Error connecting to server (${nitrado_cred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`DownloadNitradoFile: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
};

/*
    Export explicit function names; i.e BanPlayer() & UnbanPlayer() 
    that call to the private parent function HandlePlayerBan() 
    rather than write two whole different functions for each.
*/

export const BanPlayer = async (
    nitrado_cred: any, 
    client:       any, 
    gamertag:     any) => await HandlePlayerBan(nitrado_cred, client, gamertag, true);

export const UnbanPlayer = async (
    nitrado_cred: any, 
    client:       any, 
    gamertag:     any) => await HandlePlayerBan(nitrado_cred, client, gamertag, false);

export const RestartServer = async (
    nitrado_cred: any, 
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
            const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers/restart`, 
            {
                method: "POST",
                headers: 
                {
                    "Authorization": nitrado_cred.Auth,
                },
                body: JSON.stringify(params)
            });

            if (!res.ok) 
            {
                client.error(`Failed to restart Nitrado server (${nitrado_cred.ServerID}): status: ${res.status}, message: ${res.statusText}: RestartServer`);
                return 1; // Return error status on failed status code.
            } 
            else 
            {
                return 0;
            }
        } 
        catch (error: any) 
        {
            client.error(`RestartServer: Error connecting to server (${nitrado_cred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`RestartServer: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
};

export const FetchServerSettings = async (
    nitrado_cred: any, 
    client:       any, 
    fetcher:      any) => 
{
    for (let retries = 0; retries <= MAX_RETRIES; retries++) 
    {
        try 
        {
            // get current status
            const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers`, 
            {
                headers: 
                {
                    "Authorization": nitrado_cred.Auth
                }
            });

            if (!res.ok) 
            {
                client.error(`Failed to get Nitrado server stats (${nitrado_cred.ServerID}): status: ${res.status}, message: ${res.statusText}: ${fetcher} via FetchServerSettings`);
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
            client.error(`${fetcher} via FetchServerSettings: Error connecting to server (${nitrado_cred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`${fetcher} via FetchServerSettings: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
};

export const PostServerSettings = async (
    nitrado_cred: any, 
    client:       any, 
    category:     any, 
    key:          any, 
    value:        any) => 
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
                    const res = await fetch(`https://api.nitrado.net/services/${nitrado_cred.ServerID}/gameservers/settings`, {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            ...formData.getHeaders(),
                            "Authorization": nitrado_cred.Auth
                        },
                        body: data,
                    });
                    if (!res.ok) 
                    {
                        client.error(`Failed to get post Nitrado server settings (${nitrado_cred.ServerID}): status: ${res.status}, message: ${res.statusText}: PostServerSettings`);
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
            client.error(`PostServerSettings: Error connecting to server (${nitrado_cred.ServerID}): ${error.message}`);
            if (retries === MAX_RETRIES) 
            {
                client.error(`PostServerSettings: Error connecting to server (${nitrado_cred.ServerID}) after ${MAX_RETRIES} retries`);
                return 1;
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retrying
    }
};

export const CheckServerStatus = async (
    nitrado_cred: any, 
    client:       any) => 
{
    const data = await module.exports.FetchServerSettings(nitrado_cred, client, "CheckServerStatus");  // Fetch server status

    if (data && data != 1) 
    {
        if (data && data.data.gameserver.status === "stopped") 
        {
            client.log(`Restart of Nitrado server ${nitrado_cred.ServerID} has been invoked by the bot,
                                                    the periodic check showed status of "${data.data.gameserver.status}".`);
            // Write optional "restart_message" to set in the Nitrado server logs and send a notice "message" to your server community.
            let restart_message = "Server being restarted by periodic bot check.";
            let message = "The server was restarted by periodic bot check!";

            module.exports.RestartServer(
                nitrado_cred, 
                client, 
                restart_message, message);
        }
    }
};

export const DisableBaseDamage = async (
    nitrado_cred: any, 
    client: any, 
    preference: any) => 
    {
    const pref = preference ? "1" : "0";
    const posted = await module.exports.PostServerSettings(nitrado_cred, client, "config", "disableBaseDamage", pref);
    if (posted == 1) return 1;

    const remoteDirs = await GetRemoteDir(nitrado_cred, client);
    if (remoteDirs == 1) return 1;
    const basePath = remoteDirs.filter((dir: any) => dir.type == "dir")[0].path
    const remoteDirsFromBase = await GetRemoteDir(nitrado_cred, client, basePath);
    if (remoteDirsFromBase == 1) return 1;
    const missionPath = remoteDirsFromBase[0].path;
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;
    await module.exports.DownloadNitradoFile(nitrado_cred, client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir, "utf-8"));
    gameplay.GeneralData.disableBaseDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(nitrado_cred, client, missionPath, "cfggameplay.json", jsonDir);
    if (uploaded == 1) return 1;

    return 0;
};

export const DisableContainerDamage = async (
    nitrado_cred: any, 
    client: any, 
    preference: any) => 
{
    const pref = preference ? "1" : "0";
    const posted = await module.exports.PostServerSettings(nitrado_cred, 
                                                            client, "config", "disableContainerDamage", pref);
    if (posted == 1) return 1;

    const remoteDirs = await GetRemoteDir(nitrado_cred, client);
    if (remoteDirs == 1) return 1;
    const basePath = remoteDirs.filter((dir: any) => dir.type == "dir")[0].path
    const remoteDirsFromBase = await GetRemoteDir(nitrado_cred, client, basePath);
    if (remoteDirsFromBase == 1) return 1;
    const missionPath = remoteDirsFromBase[0].path;
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;
    await module.exports.DownloadNitradoFile(nitrado_cred, client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir, "utf-8"));
    gameplay.GeneralData.disableContainerDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(nitrado_cred, client, missionPath, "cfggameplay.json", jsonDir);
    if (uploaded == 1) return 1;

    return 0;
};
