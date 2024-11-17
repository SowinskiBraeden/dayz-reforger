const { makeURLSearchParams } = require('@discordjs/rest');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

const createWebhook = async (client, channel_id, name, avatar) => {
  const rest = new REST({ version: '10' }).setToken(client.config.Token);
  return await rest.post(Routes.channelWebhooks(channel_id), {
    body: {
      name: name,
      avatar: avatar
    }
  });
};

module.exports = {
  GetWebhook: async (client, webhookName, channel_id) => {
    // Get all webhooks from configured channel
    const rest = new REST({ version: '10' }).setToken(client.config.Token);
    const webhooks = await rest.get(Routes.channelWebhooks(channel_id));

    let webhook = null;
    if (webhooks.length == 0) {
      // If no webhook exists, create new webhook with given name for this channel
      webhook = createWebhook(client, channel_id, webhookName, client.config.AvatarData);
    } else {
      // Check existing webhooks for one with given name
      let exists = false;
      for (let i = 0; i < webhooks.length; i++) {
        if (webhooks[i].name == webhookName) {
          webhook = webhooks[i];
          exists = true;
          break;
        }
      }

      if (!exists) webhook = createWebhook(client, channel_id, webhookName, client.config.AvatarData);
    }

    return webhook;
  },

  WebhookSend: async (client, webhook, content) => {
    const rest = new REST({ version: '10' }).setToken(client.config.Token);
    return await rest.post(Routes.webhook(webhook.id, webhook.token), {
      body: content,
      query: makeURLSearchParams({ wait: true })
    });
  },

  WebhookMessageEdit: async (client, webhook, message_id, content) => {
    const rest = new REST({ version: '10' }).setToken(client.config.Token);
    return rest.patch(Routes.webhookMessage(webhook.id, webhook.token, message_id), {
      body: content
    });
  }
}
