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
      return 0;
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
        return 0;
      } catch (error) {
        client.error(`Error during restart request: ${error.message}`);
        if (retries === maxRetries) throw new Error(`RestartServer: Failed to fetch data after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },

  CheckServerStatus: async (client) => {
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
          client.error(`Failed to get Nitrado server stats (${client.config.Nitrado.ServerID}): status: ${res.status}, message: ${errorText}: CheckServerStatus`);
        } else {
          const data = await res.json();
          if (data && data.data.gameserver.status === 'stopped') {
            client.log(`Restart of Nitrado server ${client.config.Nitrado.ServerID} has been invoked by the bot, the periodic check showed status of "${data.data.gameserver.status}".`);
            // Write optional "restart_message" to set in the Nitrado server logs and send a notice "message" to your server community.
            restart_message = 'Server being restarted by periodic bot check.';
            message = 'The server was restarted by periodic bot check!';
  
            module.exports.RestartServer(client, restart_message, message);
          }
        }
        return 0;
      } catch (error) {
        client.error(`Failed to connect to Nitrado (${client.config.Nitrado.ServerID}): ${error.message}`);
        if (retries === maxRetries) throw new Error(`CheckServerStatus: Failed to fetch data after ${maxRetries} retries`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retrying
    }
  },
}
