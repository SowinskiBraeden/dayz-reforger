const { finished } = require('stream/promises');
const concat = require('concat-stream');
const { Readable } = require('stream');
const FormData = require('form-data');
const fs = require('fs');
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

// Private functions (only called locally)

const HandlePlayerBan = async (client, gamertag, ban) => {
  for (let retries = 0; retries <= maxRetries; retries++) {
    try {
      // get current bans
      const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers`, {
        headers: {
          "Authorization": client.config.Nitrado.Auth
        }
      }).then(response => 
        response.json().then(data => data)
      ).then(res => res);

      let bans = res.data.gameserver.settings.general.bans;
      if (ban) bans += `\r\n${gamertag}`;
      else if (!ban) bans = bans.replace(gamertag, '');
      else client.error("Incorrect Ban Option: HandlePlayerBan");

      const formData = new FormData();
      formData.append("category", "general");
      formData.append("key", "bans");
      formData.append("value", bans);
      formData.pipe(concat(data => {
        async function sendList() {
          await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/settings`, {
            method: "POST",
            credentials: 'include',
            headers: {
              ...formData.getHeaders(),
              "Authorization": client.config.Nitrado.Auth
            },
            body: data,
          });
        }
        sendList();
      }));
    } catch (error) {
      if (retries === maxRetries) throw new Error(`HandlePlayerBans: Failed to fetch data after ${maxRetries} retries`);
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
          client.error(`Error downloading File "${filename}":`);
          client.error(res);
          return -1;
        }
        const { body } = await fetch(res.data.token.url);
        await finished(Readable.fromWeb(body).pipe(stream));
        return 0;
      } catch (error) {
        if (retries === maxRetries) throw new Error(`DownloadNitradoFile: Failed to fetch data after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },

  /*
    Export explicit function names; i.e BanPlayer() & UnbanPlayer() 
    that call to the private parent function HandlePlayerBan() 
    rather than write two whole different functions for each.
  */

  BanPlayer:   async (client, gamertag) => HandlePlayerBan(client, gamertag, true),
  UnbanPlayer: async (client, gamertag) => HandlePlayerBan(client, gamertag, false),
  
  RestartServer: async (client) => {
    for (let retries = 0; retries < maxRetries; retries++) {
      try {
        const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers/restart`, {
          method: "POST",
          headers: {
            "Authorization": client.config.Nitrado.Auth,
          }
        }).then(response => 
          response.json().then(data => data)
        ).then(res => res);    
      } catch (error) {
        if (retries === maxRetries) throw new Error(`RestartServer: Failed to fetch data after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },
}