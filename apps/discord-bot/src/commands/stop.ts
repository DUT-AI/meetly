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
    let isInteractionValid = false;
    // 1. Attempt to defer reply to beat Discord's strict 3-second acknowledgement deadline
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ ephemeral: false });
        isInteractionValid = true;
      } catch (deferErr: any) {
        console.warn('[Command:Stop] Failed to defer interaction (will fallback to channel send):', deferErr.message);
        isInteractionValid = false;
      }
    } else {
      isInteractionValid = true;
    }

    const respond = async (options: { content?: string; embeds?: EmbedBuilder[] } | string) => {
      const payload = typeof options === 'string' ? { content: options } : options;
      if (isInteractionValid) {
        try {
          await interaction.editReply(payload);
          return;
        } catch (editErr: any) {
          console.warn('[Command:Stop] editReply failed, falling back to channel send:', editErr.message);
          isInteractionValid = false;
        }
      }
      if (interaction.channel && 'send' in interaction.channel) {
        try {
          await (interaction.channel as any).send(payload);
        } catch (sendErr: any) {
          console.error('[Command:Stop] Fallback channel send failed:', sendErr.message);
        }
      }
    };

    if (!interaction.guildId) {
      await respond('**Error**: This command must be used in a server.');
      return;
    }

    if (sessionManager.isStopping(interaction.guildId)) {
      await respond('⏳ Meeting is already being finalized and saved. Please wait a moment...');
      return;
    }

    if (!sessionManager.isRecording(interaction.guildId)) {
      await respond('**Error**: No meeting is currently being recorded in this server.');
      return;
    }

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
          value: `[Click to Listen Meeting Audio](${result.presignedUrl})`,
        });
      }

      await respond({ embeds: [embed] });
    } catch (err: any) {
      console.error('[Command:Stop] Failed to stop recording session:', err);
      await respond(`Failed to finalize meeting: ${err.message}`);
    }
  },
};
