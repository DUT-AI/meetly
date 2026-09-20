import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { storageClient } from "../storage/minio-client";

export const purgeCommand = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription(
      "Permanently deletes a meeting recording from storage (test data cleanup)",
    )
    .addStringOption((option) =>
      option
        .setName("meeting_id")
        .setDescription("The UUID of the meeting to delete")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels | PermissionFlagsBits.Administrator,
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Must be used within a server.",
        ephemeral: true,
      });
      return;
    }

    const meetingId = interaction.options.getString("meeting_id", true).trim();

    await interaction.deferReply({ ephemeral: true });

    try {
      const deletedCount = await storageClient.deleteMeeting(meetingId);
      if (deletedCount === 0) {
        await interaction.editReply({
          content: `No objects found for meeting ID \`${meetingId}\` in storage.`,
        });
      } else {
        await interaction.editReply({
          content: `**Purged successfully:** Deleted ${deletedCount} object(s) associated with meeting \`${meetingId}\` from storage. Any existing preview links are now invalidated.`,
        });
      }
    } catch (err: any) {
      console.error("[Command:Purge] Error purging meeting:", err);
      await interaction.editReply({
        content: `Failed to delete meeting: ${err.message}`,
      });
    }
  },
};
