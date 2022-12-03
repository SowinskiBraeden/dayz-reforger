module.exports = async (client, interaction) => {
  if (interaction.isCommand()) return;
  /*
    This file handles all menu and button interactions
    from any command
  */
 
  let GuildDB = await client.GetGuild(interaction.guildId);
  const interactionName = interaction.customId.split("-")[0];
  let interactionHandler = client.interactionHandlers.get(interactionName);

  try {
    interactionHandler.run(client, interaction, GuildDB);
  } catch (err) {
    client.sendInternalError(interaction, err);
  }
}