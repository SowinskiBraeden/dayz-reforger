const { finished } = require('stream/promises');
const concat = require('concat-stream');
const { Readable } = require('stream');
const FormData = require('form-data');
const fs = require('fs');

module.exports = {
  
  DownloadNitradoFile: async (client, filename, outputDir) => {
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
      return;
    }
    const { body } = await fetch(res.data.token.url);
    await finished(Readable.fromWeb(body).pipe(stream));
  },

  HandlePlayerBan: async (client, gamertag, ban) => {
    // get current bans
    const res = await fetch(`https://api.nitrado.net/services/${client.config.Nitrado.ServerID}/gameservers`, {
      headers: {
        "Authorization": client.config.Nitrado.Auth
      }
    }).then(response => 
      response.json().then(data => data)
    ).then(res => res);
  
    let bans = res.data.gameserver.settings.general.bans;
    if (ban) bans += `${gamertag}\r\n`;
    else if (!ban) bans = bans.replace(`${gamertag}\r\n`, '');
    else {
      client.error("Incorrect Ban Option: HandlePlayerBan")
      throw "Incorrect Ban Option: HandlePlayerBan"
    }

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
  }
}