import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { sessionManager } from '../core/session-manager';
import { config } from '../config';

const recordCommandBuilder = new SlashCommandBuilder()
  .setName('record')
  .setDescription('Starts recording the current Discord voice meeting for Meetly');

if (config.NODE_ENV === 'production') {
  recordCommandBuilder.setDefaultMemberPermissions(
    PermissionFlagsBits.ManageChannels | PermissionFlagsBits.MuteMembers
  );
} else {
  recordCommandBuilder.setDefaultMemberPermissions(null);
}

export const recordCommand = {
  data: recordCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    let isInteractionValid = false;
    // 1. Attempt to defer reply to beat Discord's strict 3-second acknowledgement deadline
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ ephemeral: true });
        isInteractionValid = true;
      } catch (deferErr: any) {
        console.warn('[Command:Record] Failed to defer interaction (will fallback to channel send):', deferErr.message);
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
          console.warn('[Command:Record] editReply failed, falling back to channel send:', editErr.message);
          isInteractionValid = false;
        }
      }
      if (interaction.channel && 'send' in interaction.channel) {
        try {
          await (interaction.channel as any).send(payload);
        } catch (sendErr: any) {
          console.error('[Command:Record] Fallback channel send failed:', sendErr.message);
        }
      }
    };

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await respond('**Error**: You must be connected to a voice channel to start recording.');
      return;
    }

    if (!interaction.guildId || !interaction.channel) {
      await respond('**Error**: This command can only be used within a server channel.');
      return;
    }

    if (sessionManager.isRecording(interaction.guildId)) {
      await respond('A meeting is already being recorded in this server. Use `/stop` to finalize it.');
      return;
    }

    try {
      const session = await sessionManager.startSession(member, interaction.channel);

      // Send minimal, compliant notification to the channel informing participants
      if (interaction.channel && 'send' in interaction.channel) {
        try {
          await (interaction.channel as any).send(
            `🎙️ **Meeting recording has started** in <#${voiceChannel.id}> by <@${member.id}>.`
          );
        } catch {
          // Non-fatal if channel send fails
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Meeting Recording Started')
        .setColor(0x5865f2) // Discord Blurple
        .addFields(
          { name: 'Voice Channel', value: `<#${voiceChannel.id}>`, inline: true },
          { name: 'Meeting ID', value: `\`${session.meetingId}\``, inline: true },
          { name: 'Initiator', value: `<@${member.id}>`, inline: true }
        )
        .setDescription(
          'Meetly is now capturing and synchronizing audio tracks.\nWhen finished, run `/stop` or leave the voice channel.\n*Session details are only visible to you.*'
        )
        .setFooter({ text: 'Meetly AI Platform • Confidential' })
        .setTimestamp();

      await respond({ embeds: [embed] });
    } catch (err: any) {
      console.error('[Command:Record] Failed to start:', err);
      await respond(`Failed to start recording: ${err.message}`);
    }
  },
};
