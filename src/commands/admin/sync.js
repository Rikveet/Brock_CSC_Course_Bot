const {SlashCommandBuilder, PermissionsBitField} = require("discord.js");
const progressbar = require("string-progressbar");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription("Syncs all channel's permissions to it's category.")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    ,
    async execute(interaction) {
        const {member} = interaction;
        const client = interaction.client;
        try {
            if (member.permissions.serialize().Administrator) {
                const channels = client.channels.cache;
                const total = channels.size;
                let current = 0;
                await interaction.deferReply({
                    content:
                        "Syncing progress: " +
                        progressbar.splitBar(total, current) +
                        "%",
                });
                for (const ch of channels) {
                    if (ch[1].parentId !== null) {
                        await ch[1].lockPermissions();
                    }
                    current++;
                    await interaction.editReply({
                        content:
                            "Syncing progress: " +
                            progressbar.splitBar(total, current) +
                            "%",
                    });
                }
                await interaction.editReply({
                    content: "Synced all channels.",
                });
            } else {
                await interaction.reply({
                    content: "You are not allowed to use this command.",
                    ephemeral: true,
                });
            }
        } catch (err) {
            console.log(`[ERROR] [sync.js] ${err.message}`);
            await interaction.reply({
                content: "Failed to Sync all/some channels.",
                ephemeral: true,
            });
        }
    }
}