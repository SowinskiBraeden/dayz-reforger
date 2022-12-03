module.exports = {
  settings: [
    {
      name: "allowed_channels",
      description: `
        If you wish to limit users to use the bot in some channels, you can configure \`allowed_channels\`. To do so, use \`/config allowed_channels add <your channel>\` to add a channel to a list of allowed channels.

        To remove a channel, use \`/config allowed_channel remove <your channel>\`.
      `
    },
    {
      name: "action_channel",
      description: `
        To save the hastle of cluttered channels, you can configure a dedicated channel for the \`/action\` command. To do so, use \`/config action_channel set <channel>\`. This will send any output for the \`/action\` command to this channel.

        To remove this configuration, use \`/config action_channel remove\`
      `
    },
    {
      name: "tweet_channel",
      description: `
        To save the hastle of cluttered channels, you can configure a dedicated channel for the \`/tweet\` command. To do so, use \`/config tweet_channel set <channel>\`. This will send any output for the \`/tweet\` command to this channel.

        To remove this configuration, use \`/config tweet_channel remove\`
      `
    },
    {
      name: "adverts_channel",
      description: `
        Users with the configured commercial role can create advertisements for their commercial business. To keep your channels clean, you can limit the output of this command to a dedicated channel. To do so, use \`/config adverts_channel set <channel>\`. This will send any adverts to this channel.

        To remove this configuration, use \`/config adverts_channel remove\`.
      `
    },
    {
      name: "dispatcher_channel",
      description: `
        In order for the \`/311\` or \`/911\` commands to be used, you need to configure two settings. \`dispatcher_channel\` is one of the settings to configure. This will redirect all \`/311\` or \`/911\` reports to a dedicated channel. Use \`/config dispatcher_channel set <channel>\` to configure this setting.

        To remove this configuration, use \`/config dispatcher_channel remove\`.
      `
    },
    {
      name: "starting_balance",
      description: `
        New users in your guild receive $1000.00 as their starting balance. This can be configured, use \`/config starting_balance <amount>\`. This can be a floating point number, e.g 150.40

        floating point number: a number value with a decimal.
      `
    },
    {
      name: "income_role",
      description: `
        Users can work once a day to earn money, but this will require a role with a set daily income. To configure a new income role, use \`/config income_role set <role> <daily income>\`.

        Users with one of these configured roles can use the \`/work\` command once a day to earn their set daily income.
        
        Note: If a user has more than one role to earn income, using the \`/work\` command will earn them the highest income from one of the roles they have.

        To remove one of the configured roles, use \`/config income_roles remove <role>\`.
      `
    },
    {
      name: "bot_admin_role",
      description: `
        Some commands are limited to users who can manage the guild (Admin privilages), but if you wish for users without admin privilages to access commands such as \`/config\` \`/money\` or \`/reset\`. You can configure a bot admin role.
        
        Use \`/config bot_admin_role set <role>\` to configure the bot admin role.

        To remove this configuration, use \`/config bot_admin_role remove\`.
      `
    },
    {
      name: "commercial_role",
      description: `
        Users with the commercial_role have access to business related commands, to configure this role to give to some users, use \`/config commercial_role set <role>\`.

        To remove this configured role, use \`/config commercial_role remove\`.
      `
    },
    {
      name: "officer_role",
      description: `
        The \`/fine\` command requires a user to have a configured officer role. To configure this role, use \`/config officer_role set <role>\`

        To remove this configured role, use \`/config officer_role remove\`.
      `
    },
    {
      name: "dispatcher_role",
      description: `
        In order for the \`/311\` or \`/911\` commands to be used, you need to configure two settings. \`dispatcher_role\` is one of the settings to configure. This will allow users to interact with all \`/311\` or \`/911\` reports. Use \`/config dispatcher_role set <role>\` to configure this setting.

        To remove this configuration, use \`/config dispatcher_role remove\`.
      `
    },
    {
      name: "only_officers_search",
      description: `
        The \`/search\` command allows users to view other users inventories. If you wish to limit this command, you can do so by configuring \`only_officers_search\`. Use \`/config only_officers_search <true/false>\`. This will optionally limit the \`/search\` command to users with the configured officer role.
      `
    },
    {
      name: "can_dismiss_invoices",
      description: `
        This configurations allows users who have been given an invoice to \`Dismiss & Delete\` an invoice they choose rather than pay. This can be set to false, so users must pay their invoice.\n\n**Note:** Invoices are paid from a users bank balance, and not with their cash balance.
      `
    },
    {
      name: "view",
      description: `
        There is a lot of settings you can configure. To view a all configured settings, use the following: \`/config view\`. This will display all configured settings, and their values if configured.
      `
    },
    {
      name: "reset",
      description:`
        This will reset all configurations back to default settings, clearing all set roles and channels.
      `
    },
    {
      name: "casino_multiplier",
      description: `
        This configurations allows you to customize the multiplier used to determine the winnings from casino games.
      `
    },
    {
      name: "work_limiter",
      description: `
        This configuration allows you to alter the number of hours a user has to wait between the use of the \`/work\` command. By default, users need to wait **24** hours before the can use the \`/work\` command again.
      `
    }
  ]
}