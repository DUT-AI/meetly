import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  OAuth2Scopes,
  PermissionFlagsBits,
} from 'discord.js';
import { config } from './config';
import { recordCommand } from './commands/record';
import { stopCommand } from './commands/stop';
import { statusCommand } from './commands/status';
import { purgeCommand } from './commands/purge';
import { sessionManager } from './core/session-manager';
import { storageClient } from './storage/minio-client';
import { registerSlashCommands } from './register-commands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Map commands by name
const commandMap = new Map<string, any>([
  ['record', recordCommand],
  ['stop', stopCommand],
  ['status', statusCommand],
  ['purge', purgeCommand],
]);

// ── 1. BOT READY ──────────────────────────────────────────
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`=========================================`);
  console.log(`🤖 Meetly Discord Audio Extractor Online!`);
  console.log(`Logged in as: ${readyClient.user.tag}`);
  console.log(`Client ID: ${readyClient.user.id}`);
  console.log(`=========================================`);

  // Verify storage connection & bucket
  await storageClient.ensureBucketExists();

  // Auto-sync slash commands on startup (ensures production & development stay up to date)
  await registerSlashCommands();

  // Set bot presence
  readyClient.user.setActivity('meetings & voice channels', {
    type: ActivityType.Listening,
  });

  // Generate invite URL with required permissions
  const inviteUrl = readyClient.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ],
  });
  console.log(`[Invite URL] Invite this bot using:\n${inviteUrl}\n`);
});

// ── 2. SLASH COMMAND ROUTING ──────────────────────────────
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command executed: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error: any) {
    console.error(`Error executing command /${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: `❌ An unexpected error occurred: ${error.message}`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `❌ An unexpected error occurred: ${error.message}`,
        ephemeral: true,
      });
    }
  }
});

// ── 3. GHOST-BUSTER: AUTO-STOP ON EMPTY CHANNEL ───────────
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guildId = oldState.guild.id;
  const session = sessionManager.getSession(guildId);
  if (!session) return;

  const botVoiceChannel = oldState.guild.members.me?.voice.channel;
  if (!botVoiceChannel) return;

  // Only check if the event occurred in the channel the bot is actively recording
  if (botVoiceChannel.id === session.voiceChannelId) {
    const humanCount = botVoiceChannel.members.filter((m) => !m.user.bot).size;

    if (humanCount === 0) {
      console.log(`[Ghost-Buster] Channel is empty. Auto-stopping meeting ${session.meetingId}...`);
      try {
        const textChannel = (await client.channels.fetch(session.textChannelId)) as any;
        if (textChannel && 'send' in textChannel) {
          await textChannel.send('⏹️ **All participants left.** Auto-finalizing meeting recording...');
        }
        await sessionManager.stopSession(guildId);
      } catch (err: any) {
        console.error('[Ghost-Buster] Error stopping session:', err.message);
      }
    }
  }
});

// ── 4. GRACEFUL SHUTDOWN ──────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n[Shutdown] Received ${signal}. Cleaning up active sessions...`);
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start client
if (config.DISCORD_BOT_TOKEN) {
  client.login(config.DISCORD_BOT_TOKEN).catch((err) => {
    console.error('❌ Failed to login to Discord:', err.message);
  });
} else {
  console.warn('⚠️ DISCORD_BOT_TOKEN is not configured. Bot will not login.');
}
