const {REST, Routes, ActionRowBuilder, ButtonBuilder} = require("discord.js");
const {Client, Collection, Events, GatewayIntentBits} = require("discord.js");
const {Guilds, MessageContent, GuildMessages, GuildMembers , GuildMessageReactions} =
    GatewayIntentBits;
const path = require("path");
const fs = require("fs");

// LOAD TOKEN

// load .env file
require("dotenv").config();
// config written in .env file of the project
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
// missing credentials
if (!TOKEN) {
    throw new Error("Missing token, it is required to initialize your bot");
}

// INITIALIZE THE BOT

// Create a new client instance
const client = new Client({
    intents: [Guilds, MessageContent, GuildMessages, GuildMembers, GuildMessageReactions],
});

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

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();

// Holds user request for roles command and allow user to switch between pages
const user_roles_request = {}
// Amount of time user can be inactive with the roles gui
const afk_time_sec = 60
// Remove the user from user_roles_request if user has been inactive
setInterval(()=>{
    const timeoutKeys = Object.keys(user_roles_request).filter((key)=>{
        const lastUpdate = user_roles_request[key]["lastUpdate"]
        return ((Date.now()-lastUpdate)/1000) > afk_time_sec
    })
    timeoutKeys.forEach(key=>{
        delete user_roles_request[key]
    })
}, afk_time_sec * 1000)

// Get the page from list of pages per user
function get_page(user_id) {
    const page = [];
    user_roles_request[user_id]["pages"][user_roles_request[user_id]["index"]].forEach((msg_row) => {
        const row = new ActionRowBuilder();
        msg_row.forEach((msg) => row.addComponents(msg));
        page.push(row);
    });
    user_roles_request[user_id]["lastUpdate"] = Date.now();
    return page;
}

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {

    if (interaction.isButton()) {
        const {user, guild} = interaction;
        const _customId = interaction.customId.split('_');
        const customId = _customId[0];
        const pageIndex = parseInt(_customId[1]);
        const rowIndex = parseInt(_customId[2]);
        const buttonIndex = parseInt(_customId[3]);

        if (user_roles_request[user.id] !== undefined) {
            switch (customId) {
                case "next": {
                    user_roles_request[user.id]["index"] += 1;
                    await interaction.update({components: get_page(user.id)});
                    return;
                }
                case "previous": {
                    user_roles_request[user.id]["index"] -= 1;
                    await interaction.update({components: get_page(user.id)});
                    return;
                }
                default: {
                    async function sendUpdatedRolesInteraction(_interaction, uid, _style, role) {

                        user_roles_request[uid]["pages"][pageIndex][rowIndex][buttonIndex] = new ButtonBuilder()
                            .setLabel(role.name)
                            .setStyle(_style)
                            .setCustomId(`${role.id}_${pageIndex}_${rowIndex}_${buttonIndex}`)
                        user_roles_request[uid]["lastUpdate"] = Date.now();
                        await _interaction.update({components: get_page(uid)});
                    }

                    // @ts-ignore
                    async function sendError(inter, err) {
                        console.log(`[ERROR] [index.js] ${err.message}`);
                        await inter.reply({
                            content:
                                "I do not have the permissions to give or remove the role.",
                            ephemeral: true,
                        });
                    }

                    const role = await guild.roles.cache.get(customId);
                    await guild.members
                        .fetch({user: user.id, force: true})
                        .then((member) => {
                            if (member.roles.cache.has(customId)) {
                                member.roles
                                    .remove(role)
                                    .then(() => {
                                        sendUpdatedRolesInteraction(
                                            interaction,
                                            user.id,
                                            "Secondary",
                                            role
                                        );
                                    })
                                    .catch((e) => {
                                        sendError(interaction, e);
                                    });
                            } else {
                                member.roles
                                    .add(role)
                                    .then(() => {
                                        sendUpdatedRolesInteraction(
                                            interaction,
                                            user.id,
                                            "Success",
                                            role
                                        );
                                    })
                                    .catch((e) => {
                                        sendError(interaction, e);
                                    });
                            }
                        })
                        .catch((err) => {
                            console.log(`[ERROR] [index.js] ${err.message}`);
                            sendError(
                                interaction,
                                "Could not retrieve user information."
                            );
                        });

                    return;
                }
            }
        } else {
            await interaction.reply({
                content:
                    "Session timed out due to in-activity. Please use the /roles command again. You can close this message.",
                ephemeral: true,
            });
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        if (interaction.commandName === 'roles') {
            const [pages, id, _interaction] = await command.execute(interaction)
            user_roles_request[id] = {
                index: 0,
                pages,
                interaction: _interaction,
                lastUpdate: Date.now()
            };
        } else {
            await command.execute(interaction);
        }
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
