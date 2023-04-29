const {SlashCommandBuilder, PermissionsBitField} = require("discord.js");
const progressbar = require("string-progressbar");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription("Locks channel/all channels except general.")
        .addStringOption(option =>
            option
                .setName('channel_name')
                .setDescription('Enter the channel, category name. Leave this empty if you want to lock down all channels.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    ,
    async execute(interaction) {
        const {member, guild, options} = interaction;
        const client = interaction.client;
        const channel = options.getChannel("channel_name");
        try {
            if (member.permissions.serialize().Administrator) {
                if (channel !== null) {
                    if (channel.permissionsFor(guild.roles.everyone).has(PermissionsBitField.Flags.ViewChannel)) {
                        await channel.permissionOverwrites.set([
                            {
                                id: guild.roles.everyone,
                                deny: [PermissionsBitField.Flags.SendMessages],
                            },
                        ]);
                        await interaction.reply({
                            content: "Locked " + channel.name,
                            ephemeral: true,
                        });
                    } else {
                        await interaction.reply({
                            content: "Unable to lock as it is not accessible to everyone.",
                            ephemeral: true,
                        });
                    }
                } else {
                    const channels = client.channels.cache;
                    const total = channels.size;
                    let current = 0;
                    await interaction.deferReply({
                        content: "Locking progress: " + progressbar.splitBar(total, current) + "%",
                    });
                    for (const ch of channels) {
                        if (
                            await ch[1]
                                .permissionsFor(guild.roles.everyone)
                                .has(PermissionsBitField.Flags.ViewChannel)
                        ) {
                            await ch[1].permissionOverwrites.set([
                                {
                                    id: guild.roles.everyone,
                                    deny: [PermissionsBitField.Flags.SendMessages],
                                },
                            ]);
                        }
                        current++;
                        await interaction.editReply({
                            content: "Locking progress: " + progressbar.splitBar(total, current) + "%",
                        });
                    }
                    await interaction.editReply({
                        content: "Locked all channels.",
                    });
                }
            } else {
                await interaction.reply({
                    content: "You are not allowed to use this command.",
                    ephemeral: true,
                });
            }
        } catch (err) {
            console.log(`[ERROR] [lock.js] ${err.message}`);
            await interaction.reply({
                content: "Failed to lock all/some channels.",
                ephemeral: true,
            });
        }
    }
}