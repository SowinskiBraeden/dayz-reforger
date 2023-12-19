<!-- CONTRIBUTING -->
# Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please create a pull request. You can also simply open an issue with the `enhancement` tag.
Don't forget to give the project a star! Thanks again!

***Explore the docs »***
* [README](#readme)
* [License](#license)
* [General Contributing Guidelines](#general-contributing-guidlines)
* [Creating A New Command](#creating-a-new-command)
* [Handling Non Command Interactions](#handling-non-command-interactions)
* 

## README

Before you get started contributing, it would be an excellent idea to checkout the `README.md` file!
[» README](/README.md)

## License

[» License](/LICENSE)

## General Contributing Guidlines

When you are ready to start work on your own feature and would like to push it to the main repository. Follow these guidelines.

1. Clone the Project
2. Create your Feature Branch (`git checkout -b update/AmazingFeature`)
3. Commit your Changes (`git commit -m 'update/your-update'`) please use the following for your commits:  
  i.   `update/your-update`  
  ii.  `fix/your-fix`  
  iii. `refactor/your-refactor` (Refactoring code, doesn't change behavior)
  iv.  `change/your-change`     (Changing existing code behavior)
4. Push to the Branch (`git push origin update/AmazingFeature`)
5. Open a Pull Request

Do keep in mind of the [package.json](/package.json) version. Version structure is as follows: `(major).(minor).(patch)`

## Creating A New Command

If you're simply looking to add a new command and not make significant changes to the backend of the bot. Here is a simple guideline to create a new command.

1. Create a new command file in the `/commands` folder.
2. Name this file as the name of the command. E.g. `new-command.js`
3. Use the following template to start your command file:
  ```javascript
    const { EmbedBuilder } = require('discord.js');                                  // Not required, but encouraged to use embeds to reply to commands.
    const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes; // Not required but recommended for clear cmd options.

    module.exports = {
      name: "new-command",                   // Insert your command name here, I encourage that you use hyphens `-` to seperate words.
      debug: false,                          // Do not change this
      global: false,                         // Do not change this
      description: "My command Description", // Describe your command
      usage: "",                             // Insert command parameters here E.g. useage: "[cmd param 1] [cmd param 2]"
      options: [
        // Below example of a command option
        {
          name: "cmd_param_1",
          description: "What this parameter is for",
          value: "cmd_param_1_default", // Default value of this parameter
          type: CommandOptions.String,
          required: true,
        }
      ],
      SlashCommand: { // Do not change the name of this funciton
        /**
        *
        * @param {require("../structures/DayzRBot")} client
        * @param {import("discord.js").Message} message
        * @param {string[]} args
        * @param {*} param3
        */
        run: async (client, interaction, args, { GuildDB }, start) => { // Do not change the name of this function, or change the parameters.

          // Do your command stuff here ...

          /* 
            Optionally if your command will take longer than 3 seconds to do its stuff
            You can easily defer your interaction reply as seen below:

            await interaction.deferReply({ optional_data_here });
  
            If you use the deferReply, in order to update the message when the command is complete, use the following:

            return interaction.editReply({ return_data_here })
          */

          // If you do not use defer reply, you can use this to complete your command interaction.
          return interaction.send({ embeds: [
            new EmbedBuilder()
              .setColor(client.config.Colors.Green)
              .setDescription("Hooray! Your command is complete.")
            ]
          });
        },
      },
    }
  ```

  That is all you need to do to add your new command to the bot, do keep in mind the bot will need to be restarted to load any new commands.
  All commands are automatically loaded from the `/commands` folder when the bot is started.

## Handling Non Command Interactions

Adding additional interactions to your command? Buttons, Select Menus, etc? You can easily handle those interactions by doing the following.

1. Create an `Interactions` object within your command file. E.g. my new command `/commands/greet.js` will have the following:
  ```javascript
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, } = require('discord.js'); // Some additional imported definitions for our button.
    const CommandOptions = require('../util/CommandOptionTypes').CommandOptionTypes;

    module.exports = {
      name: "greet",
      debug: false,
      global: false,
      description: "Greet a name",
      usage: "",
      options: [{
        name: "name",
        description: "Name to greet",
        value: "name", // Default value of this parameter
        type: CommandOptions.String,
        required: true,
      }],
      SlashCommand: {

        run: async (client, interaction, args, { GuildDB }, start) => {
          // Here is a simple example of this command using a button.

          let name = args[0].value

          /* 
            Here are the button options, Hello and GoodBye.
            The custom ID for each button is VERY IMPORTANT, 
            this is how we know what non-cmd interaction to 
            call, and the values we choose to pass.

            E.g.
            The first part of the custom ID is Greet, the name
            of our non-cmd interaction handler.

            SEPERATING THE VALUES ARE HYPHENS "-"

            Next value is in this example, hello or goodbye
            depending on the button.

            The final value is the variable name we want to
            pass to our non-cmd interaciton.
          */ 
          const opt = new ActionRowBuilder()
            .addComponents(

              new ButtonBuilder()
                .setCustomId(`Greet-hello-${name}`)
                .setLabel("Hello")
                .setStyle(ButtonStyle.Success),
              
              new ButtonBuilder()
                .setCustomId(`Greet-goodbye-${name}`)
                .setLabel("GoodBye")
                .setStyle(ButtonStyle.Secondary)
            
            )

          // The cmd-interaction sends the two button options to the user to click. That is the end of our CMD-INTERACTION.
          return interaction.send({ components: [opt] });
        }
      },

      // Below is my Interactions object that will define any non-cmd interactions this command will use.
      Interactions: {
        
        // Here I defined my Greet interaciton, this interaction is a NON-CMD interaction and will be called by our buttons from our cmd-interaction above.
        // It is very important the name of our non-cmd interaction matches the name we call in our Button's custom ID.
        Greet: {
          // The handler I've written connects our button interaction to this function, and passes the following variables to this run function.
          run: async (client, interaction, GuildDB) => {
            
            // Here is the code we'll write to complete our button interaction.
            
            let greeting = interaction.customId.split('-')[1]; // Get either hello or goodbye as our greeting
            let name = interaction.customId.split('-')[2]; // Get the name from the interaction id.

            let phrase = `${greeting} ${name}!`;

            // We clear the buttons away, and send our phrase with our greeting from the buttons.
            return interaction.update({ content: phrase, components: [] });
          }
        }
      }
    }
  ```

  This is all you need to do to create a non-cmd interaction for buttons, menus, etc.
