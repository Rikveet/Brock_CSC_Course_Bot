const { REST, Routes } = require("discord.js");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { Guilds } = GatewayIntentBits;
const path = require("path");
const fs = require("fs");

// LOAD TOKEN

// load .env file
require("dotenv").config();
// config writen in .env file of the project
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
// missing credentials
if (!TOKEN) {
  throw new Error("Missing token, it is required to initialize your bot");
}

// INITIALIZE THE BOT

// Create a new client instance
const client = new Client({ intents: [Guilds] });

client.commands = new Collection();
const commands = [];
// Grab all the command files from the commands directory you created earlier
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (_client) => {
  console.log(`Ready! Logged in as ${_client.user.tag}`);
});

// Deploying the command
const rest = new REST().setToken(TOKEN);
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

// Log in to Discord with your client's token
client.login(TOKEN);

// avoid crashing the bot
process.on("uncaughtException", (error, origin) => {
  console.error(error.message, error.stack, origin);
});
