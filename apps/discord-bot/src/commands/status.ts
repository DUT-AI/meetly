import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { sessionManager } from '../core/session-manager';
import { config } from '../config';

const statusCommandBuilder = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Checks the current recording status in this server');

if (config.NODE_ENV === 'production') {
  statusCommandBuilder.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels | PermissionFlagsBits.MuteMembers
  );
} else {
  statusCommandBuilder.setDefaultMemberPermissions(null);
}

export const statusCommand = {
  data: statusCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ ephemeral: true });
      } catch (deferErr: any) {
        console.warn('[Command:Status] Failed to defer interaction:', deferErr.message);
        return;
      }
    }

    if (!interaction.guildId) {
      await interaction.editReply({ content: 'Must be used within a server.' });
      return;
    }

    const session = sessionManager.getSession(interaction.guildId);

    if (!session) {
      await interaction.editReply({
        content: '**Idle**: No meeting is currently being recorded in this server.',
      });
      return;
    }

    const elapsedSeconds = Math.round((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    const embed = new EmbedBuilder()
      .setTitle('Meeting Recording in Progress')
      .setColor(0xed4245) // Red
      .addFields(
        { name: 'Meeting ID', value: `\`${session.meetingId}\``, inline: true },
        { name: 'Elapsed Time', value: `\`${minutes}m ${seconds}s\``, inline: true },
        { name: 'Voice Channel', value: `<#${session.voiceChannelId}>`, inline: true }
      )
      .setDescription('*Confidential status: only visible to you.*')
      .setFooter({ text: 'Meetly AI Platform • Confidential' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
