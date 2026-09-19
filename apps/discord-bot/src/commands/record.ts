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
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '**Error**: You must be connected to a voice channel to start recording.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guildId || !interaction.channel) {
      await interaction.reply({
        content: '**Error**: This command can only be used within a server channel.',
        ephemeral: true,
      });
      return;
    }

    if (sessionManager.isRecording(interaction.guildId)) {
      await interaction.reply({
        content: 'A meeting is already being recorded in this server. Use `/stop` to finalize it.',
        ephemeral: true,
      });
      return;
    }

    // Defer ephemerally so session details are private to initiator
    await interaction.deferReply({ ephemeral: true });

    try {
      const session = await sessionManager.startSession(member, interaction.channel);

      // Send minimal, compliant notification to the channel informing participants
      if (interaction.channel && 'send' in interaction.channel) {
        try {
          await (interaction.channel as any).send(
            `**Meeting recording has started** in <#${voiceChannel.id}> by <@${member.id}>.`
          );
        } catch {
          // Non-fatal
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

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      console.error('[Command:Record] Failed to start:', err);
      await interaction.editReply(`Failed to start recording: ${err.message}`);
    }
  },
};
