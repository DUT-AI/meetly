import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { sessionManager } from '../core/session-manager';
import { config } from '../config';

const stopCommandBuilder = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stops the active recording session and prepares the meeting audio');

if (config.NODE_ENV === 'production') {
  stopCommandBuilder.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels | PermissionFlagsBits.MuteMembers
  );
} else {
  stopCommandBuilder.setDefaultMemberPermissions(null);
}

export const stopCommand = {
  data: stopCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '**Error**: This command must be used in a server.',
        ephemeral: true,
      });
      return;
    }

    if (!sessionManager.isRecording(interaction.guildId)) {
      await interaction.reply({
        content: '**Error**: No meeting is currently being recorded in this server.',
        ephemeral: true,
      });
      return;
    }

    // Public defer to allow all participants in the channel to see the result and listen to audio
    await interaction.deferReply({ ephemeral: false });

    try {
      const result = await sessionManager.stopSession(interaction.guildId);

      const minutes = Math.floor(result.durationSeconds / 60);
      const seconds = result.durationSeconds % 60;
      const formattedDuration = `${minutes}m ${seconds}s`;

      const embed = new EmbedBuilder()
        .setTitle('Meeting Recording Finalized')
        .setColor(0x57f287) // Green
        .addFields(
          { name: 'Meeting ID', value: `\`${result.meetingId}\``, inline: true },
          { name: 'Duration', value: `\`${formattedDuration}\``, inline: true },
          { name: 'Speakers', value: `\`${result.speakerCount}\``, inline: true },
          { name: 'Status', value: 'Ready', inline: true }
        )
        .setDescription(
          'The meeting audio has been synchronized and finalized. All participants can listen using the preview link below.'
        )
        .setFooter({ text: 'Meetly AI Platform' })
        .setTimestamp();

      if (result.presignedUrl) {
        const expireMinutes = Math.round(config.PREVIEW_URL_EXPIRES_IN_SECONDS / 60);
        embed.addFields({
          name: `Audio Preview (Expires in ${expireMinutes} min)`,
          value: `[Listen to Audio Recording](${result.presignedUrl})`,
          inline: false,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error('[Command:Stop] Failed to finalize:', err);
      const safeErrorMessage = err?.message
        ? String(err.message).replace(/minio|s3/gi, 'storage service')
        : 'Internal error';
      await interaction.editReply(`Failed to finalize audio recording: ${safeErrorMessage}`);
    }
  },
};
