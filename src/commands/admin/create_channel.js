const {SlashCommandBuilder, PermissionsBitField, ChannelType} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_channel')
        .setDescription("Creates a new channel, channel description and role with the name given.")
        .addStringOption(option =>
            option
                .setName('channel_name')
                .setDescription('Channel name.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('channel_description')
                .setDescription('Topic for the channel. Leave it empty if none.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('channel_category')
                .setDescription('Category to create channels under. Leave empty if none.')
                .setRequired(false)
        ).setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    ,
    async execute(interaction) {
        const {member, guild, options, user} = interaction;
        if (member.permissions.serialize().Administrator) {
            const channels = await guild.channels.fetch();
            const channel_name = options.getString("channel_name");
            const channel_description = options.getString(
                "channel_description"
            );
            const category_name = options.getString("channel_category");
            let category;
            if (category_name !== null) {
                category = channels.find((value) => {
                    return (
                        value.type === "GUILD_CATEGORY" &&
                        value.name.toLowerCase() === category_name.toLowerCase()
                    );
                });
            }

            const new_channel = await guild.channels.create({
                name: channel_name
                }
            );
            if (channel_description !== null) {
                await guild.channels.edit(new_channel.id, {
                    topic: channel_description,
                });
            }
            if (category_name !== null) {
                if (category !== undefined) {
                    await guild.channels.edit(new_channel.id, {
                        parent: category.id,
                    });
                } else {
                    const new_category_confirmation_message =
                        await interaction.reply({
                            content:
                                "Did not find category named: " +
                                category_name +
                                " If you want to create a new category click on ✅ or click on ❌",
                            fetchReply: true,
                        });
                    Promise.all([
                        new_category_confirmation_message.react("✅"),
                        new_category_confirmation_message.react("❌"),
                    ])
                        .then(() => {
                            const filter = (reaction, _user) => {
                                return (
                                    ["✅", "❌"].includes(reaction.emoji.name) &&
                                    _user.id === user.id
                                );
                            };
                            new_category_confirmation_message
                                .awaitReactions({filter, maxEmojis: 1})
                                .then(async (collected) => {
                                    const reaction = collected.first();

                                    if (reaction.emoji.name === "✅") {
                                        category = await guild.channels.create(
                                            {
                                                name: category_name,
                                                type: ChannelType.GuildCategory,
                                                reason: `Category creation requested by ${user.id}`
                                            }
                                        );
                                        await guild.channels.edit(new_channel.id, {
                                            parent: category.id,
                                        });
                                        await interaction.editReply({
                                            content:
                                                "New Category Created, Request Processed.",
                                        });
                                    } else {
                                        await interaction.editReply({
                                            content: "Category option ignored",
                                        });
                                    }
                                });
                        })
                        .catch((err) => {
                            console.log(`[ERROR] [create_channel.js] ${err.message}`);
                            interaction.editReply({
                                content:
                                    'Failed to add confirmation emojis "✅" "❌". Discarding changes.',
                            });
                        });
                }
            } else {
                if(!interaction.replied){
                    await interaction.reply({
                        content: "Request processed.",
                        ephemeral: true,
                    });
                }else{
                    await interaction.editReply({
                        content: "Request processed.",
                        ephemeral: true,
                    });
                }

            }
        } else {
            await interaction.reply({
                content: "You are not allowed to use this command.",
                ephemeral: true,
            });
        }
    }
}