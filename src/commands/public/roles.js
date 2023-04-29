const {SlashCommandBuilder, ButtonBuilder, ActionRowBuilder} = require("discord.js");

function generatePages(roles) {
    const guild_pages = [];
    let rows = [];
    let current_button_row_index = 0;
    const button_row_limit = 4;
    let current_button_index = 0;
    const button_limit = 5;
    let page_number = 0;
    let messageRow = [];
    roles.forEach((role) => {
        if (current_button_index >= button_limit) {
            rows.push(messageRow);
            messageRow = [];
            current_button_index = 0;
            current_button_row_index++;
        }
        if (current_button_row_index >= button_row_limit) {
            messageRow = [];
            if (page_number !== 0) {
                messageRow.push(
                    new ButtonBuilder()
                        .setLabel("Previous")
                        .setStyle("Secondary")
                        .setCustomId("previous")
                );
            }
            messageRow.push(
                new ButtonBuilder()
                    .setLabel("Next")
                    .setStyle("Secondary")
                    .setCustomId("next")
            );
            rows.push(messageRow);
            guild_pages.push(rows);
            rows = [];
            messageRow = [];
            current_button_row_index = 0;
            page_number++;
        }
        messageRow.push(
            new ButtonBuilder()
                .setLabel(role.name)
                .setStyle(role.belongs_to_user ? "Success" : "Secondary")
                .setCustomId(`${role.id}_${page_number}_${current_button_row_index}_${current_button_index}`)
        );
        current_button_index++;
    });
    rows.push(messageRow);
    if(page_number>0){
        rows.push([
            new ButtonBuilder()
                .setCustomId("primary")
                .setLabel("Previous")
                .setStyle("Secondary")
                .setCustomId("previous"),
        ]);
    }
    guild_pages.push(rows);
    return guild_pages;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription("Add or remove roles. Leave filter empty to get all roles.")
        .addStringOption(option => {
            option
                .setName('degree')
                .setDescription('Example cosc, math...')
                .setRequired(false)
            return option
        })
    ,
    async execute(interaction) {
        try{
            const guild = interaction.guild;
            const member = interaction.member;
            const options = interaction.options;
            const client = interaction.client;
            const user = interaction.user;
            const server_roles = await guild.roles.fetch();
            const user_roles = member.roles.cache.map((role) => role.name);
            const bot = await guild.members.fetch(client.user.id);
            const bot_roles = bot.roles.cache;
            const filter =
                options.getString("degree_identifier") !== null
                    ? options.getString("degree_identifier")
                    : ""; //.toLowerCase()
            const filtered_roles = [];
            server_roles.forEach((role) => {
                if (filter === "" || role.name.toLowerCase().includes(filter.toLowerCase())) {
                    let is_bot_role_higher = false;

                    bot_roles.forEach((bot_role) => {
                        if (bot_role.comparePositionTo(role) > 0) {
                            is_bot_role_higher = true;
                        }
                    });
                    if (is_bot_role_higher) {
                        role.belongs_to_user = user_roles.indexOf(role.name) > -1;
                        filtered_roles.push(role);
                    }
                }
            });

            if (filtered_roles.length > 0) {
                const pages = generatePages(filtered_roles);
                const page = [];
                pages[0].forEach((msg_row) => {
                    const row = new ActionRowBuilder();
                    msg_row.forEach((msg) => row.addComponents(msg));
                    page.push(row);
                });
                await interaction.reply({
                    components: page,
                    ephemeral: true,
                });
                return [pages, user.id, interaction]
            } else {
                await interaction.reply({
                    content:
                        "Did not find any role matching your filter, to get all roles please leave the role filter option empty",
                    ephemeral: true,
                });
            }
        }catch (err) {
            console.log(`[ERROR] [roles.js] ${err.message}`)
        }

    }
}