const { finished } = require('stream/promises');
const concat = require('concat-stream');
const { Readable } = require('stream');
const FormData = require('form-data');
const fs = require('fs');
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

// Private functions (only called locally)

const UploadNitradoFile = async (client, remoteDir, remoteFilename, localFileDir) => {
  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/file_server/upload?` + new URLSearchParams({
        path: remoteDir,
        file: remoteFilename
      }), {
        method: "POST",
        headers: {
          "Authorization": client.config.Nitrado.Auth
        },
      }).then(response => 
        response.json().then(data => data)  
      ).then(res => res);

      let contents = fs.readFileSync(localFileDir, 'utf8');
      
      const uploadRes = await fetch(res.data.token.url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/binary',
          token: res.data.token.token
        },
        body: contents,
      })
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        client.error(`Failed to upload file to Nitrado (${client.config.Nitrado.ServerID}): status: ${uploadRes.status}, message: ${errorText}: UploadNitradoFile`);
        if (retries === 2) return 1; // Return error status on the second failed status code.
      } else {
        return uploadRes;
      }
    } catch (error) {
      client.error(`UploadNitradoFile: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
      if (retries === maxRetries) throw new Error(`UploadNitradoFile: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
  }
}

const PostServerSettings = async (client, category, key, value) => {
  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("key", key);
      formData.append("value", value);
      formData.pipe(concat(data => {
        async function postData() {
          const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/settings`, {
            method: "POST",
            credentials: 'include',
            headers: {
              ...formData.getHeaders(),
              "Authorization": client.config.Nitrado.Auth
            },
            body: data,
          });
          if (!res.ok) {
            const errorText = await res.text();
            client.error(`Failed to get post Nitrado server settings (${client.config.Nitrado.ServerID}): status: ${res.status}, message: ${errorText}: PostServerSettings`);
            if (retries === 2) return 1; // Return error status on the second failed status code.
          } else {
            const data = await res.json();
            return data;
          }
        }
        postData();
      }));
      return 0;
    } catch (error) {
      client.error(`PostServerSettings: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
      if (retries === maxRetries) throw new Error(`PostServerSettings: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
  }
}

const HandlePlayerBan = async (client, gamertag, ban) => {
  const data = await module.exports.FetchServerSettings(client, 'HandlePlayerBan');  // Fetch server status

  if (data && data != 1) {
    let bans = data.data.gameserver.settings.general.bans;
    if (ban) bans += `\r\n${gamertag}`;
    else if (!ban) bans = bans.replace(gamertag, '');
    else client.error("Incorrect Ban Option: HandlePlayerBan");

    let category = 'general';
    let key = 'bans';
    return await PostServerSettings(client, category, key, bans);  // returns 1 (failed) or 0 (not failed)
  }
}

const GetRemoteDir = async (client, dir="") => {
  const dirParam = client.exists(dir) ? `?dir=${dir}` : "";
  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/file_server/list${dirParam}`, {
        headers: {
          "Authorization": client.config.Nitrado.Auth
        }
      }).then(response => 
        response.json().then(data => data)
      ).then(res => res);
      
      return res.data.entries;  
    } catch (error) {
      client.error(`GetRemoteDir: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
      if (retries == maxRetries) throw new Error(`GetRemoteDir: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`)
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
  }
}

// Public functions (called externally)

module.exports = {

  DownloadNitradoFile: async(client, filename, outputDir)  => {
    for (let retries = 0; retries <= maxRetries; retries++) {
      try {
        const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/file_server/download?file=${filename}`, {
          headers: {
            "Authorization": client.config.Nitrado.Auth
          }
        }).then(response => 
          response.json().then(data => data)
        ).then(res => res);

        const stream = fs.createWriteStream(outputDir);
        if (!res.data || !res.data.token) {
          const errorText = await res.text();
          client.error(`Error downloading File "${filename}": message: ${errorText}: DownloadNitradoFile`);
          return 1;
        }
        const { body } = await fetch(res.data.token.url);
        await finished(Readable.fromWeb(body).pipe(stream));
        return 0;
      } catch (error) {
        client.error(`DownloadNitradoFile: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
        if (retries === maxRetries) throw new Error(`DownloadNitradoFile: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },

  /*
    Export explicit function names; i.e BanPlayer() & UnbanPlayer() 
    that call to the private parent function HandlePlayerBan() 
    rather than write two whole different functions for each.
  */

  BanPlayer:   async (client, gamertag) => await HandlePlayerBan(client, gamertag, true),
  UnbanPlayer: async (client, gamertag) => await HandlePlayerBan(client, gamertag, false),

  RestartServer: async (client, restart_message, message) => {
    const params = {
      restart_message: restart_message,
      message: message
    };
    // client.log('Restarting server...');
    for (let retries = 0; retries < maxRetries; retries++) {
      try {
        const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/restart`, {
          method: "POST",
          headers: {
            "Authorization": client.config.Nitrado.Auth,
          },
          body: JSON.stringify(params)
        });

        if (!res.ok) {
          const errorText = await res.text();
          client.error(`Failed to restart Nitrado server (${client.config.Nitrado.ServerID}): status: ${res.status}, message: ${errorText}: RestartServer`);
          return 1; // Return error status on failed status code.
        } else {
          return 0;
        }
      } catch (error) {
        client.error(`RestartServer: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
        if (retries === maxRetries) throw new Error(`RestartServer: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },

  FetchServerSettings: async (client, fetcher) => {
    for (let retries = 0; retries <= maxRetries; retries++) {
      try {
        // get current status
        const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers`, {
          headers: {
            "Authorization": client.config.Nitrado.Auth
          }
        });

        if (!res.ok) {
          const errorText = await res.text();
          client.error(`Failed to get Nitrado server stats (${client.config.Nitrado.ServerID}): status: ${res.status}, message: ${errorText}: ${fetcher} via FetchServerSettings`);
          if (retries === 2) return 1; // Return error status on the second failed status code.
        } else {
          const data = await res.json();
          return data;
        }
      } catch (error) {
        client.error(`${fetcher} via FetchServerSettings: Error connecting to server (${client.config.Nitrado.ServerID}): ${error.message}`);
        if (retries === maxRetries) throw new Error(`${fetcher} via FetchServerSettings: Error connecting to server (${client.config.Nitrado.ServerID}) after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },

  CheckServerStatus: async (client) => {
    const data = await module.exports.FetchServerSettings(client, 'CheckServerStatus');  // Fetch server status

    if (data && data != 1) {
      if (data && data.data.gameserver.status === 'stopped') {
        client.log(`Restart of Nitrado server ${client.config.Nitrado.ServerID} has been invoked by the bot, the periodic check showed status of "${data.data.gameserver.status}".`);
        // Write optional "restart_message" to set in the Nitrado server logs and send a notice "message" to your server community.
        restart_message = 'Server being restarted by periodic bot check.';
        message = 'The server was restarted by periodic bot check!';

        module.exports.RestartServer(client, restart_message, message);
      }
    }
  },

  DisableBaseDamage: async (client, preference) => {
    const pref = preference ? '1' : '0';
    const posted = await PostServerSettings(client, "config", "disableBaseDamage", pref);
    if (posted == 1) return 1;

    const basePath = await GetRemoteDir(client).then(dirs => dirs.filter(dir => dir.type == 'dir')[0].path)
    const missionPath = await GetRemoteDir(client, basePath).then(dirs => dirs[0].path)
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;   
    await module.exports.DownloadNitradoFile(client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir));
    gameplay.GeneralData.disableBaseDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(client, missionPath, 'cfggameplay.json', jsonDir);
    if (uploaded == 1) return 1;
   
    return 0;
  },

  DisableContainerDamage: async (client, preference) => {
    const pref = preference ? '1' : '0';
    const posted = await PostServerSettings(client, "config", "disableContainerDamage", pref);
    if (posted == 1) return 1;

    const basePath = await GetRemoteDir(client).then(dirs => dirs.filter(dir => dir.type == 'dir')[0].path)
    const missionPath = await GetRemoteDir(client, basePath).then(dirs => dirs[0].path)
    const cfggameplayPath = `${missionPath}/cfggameplay.json`;

    const jsonDir = `./logs/cfggameplay.json`;   
    await module.exports.DownloadNitradoFile(client, cfggameplayPath, jsonDir);

    let gameplay = JSON.parse(fs.readFileSync(jsonDir));
    gameplay.GeneralData.disableContainerDamage = preference;

    // write JSON to file
    fs.writeFileSync(jsonDir, JSON.stringify(gameplay, null, 2));

    const uploaded = await UploadNitradoFile(client, missionPath, 'cfggameplay.json', jsonDir);
    if (uploaded == 1) return 1;
   
    return 0;
  }
}
