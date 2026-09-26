import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  OAuth2Scopes,
  PermissionFlagsBits,
} from "discord.js";
import { purgeCommand } from "./commands/purge";
import { recordCommand } from "./commands/record";
import { statusCommand } from "./commands/status";
import { stopCommand } from "./commands/stop";
import { config } from "./config";
import { sessionManager } from "./core/session-manager";
import { storageClient } from "./storage/minio-client";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Map commands by name
const commandMap = new Map<string, any>([
  ["record", recordCommand],
  ["stop", stopCommand],
  ["status", statusCommand],
  ["purge", purgeCommand],
]);

// ── 1. BOT READY ──────────────────────────────────────────
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Meetly Discord Audio Extractor Online!`);
  console.log(`Logged in as: ${readyClient.user.tag}`);
  console.log(`Client ID: ${readyClient.user.id}`);

  // Verify storage connection & bucket
  try {
    await storageClient.ensureBucketExists();
  } catch (err: any) {
    console.warn(`[Storage] Warning during bucket verification:`, err.message);
  }

  // Set bot presence
  readyClient.user.setActivity("meetings & voice channels", {
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
    console.error(
      `Error executing command /${interaction.commandName}:`,
      error,
    );
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: `An unexpected error occurred: ${error.message}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `An unexpected error occurred: ${error.message}`,
          ephemeral: true,
        });
      }
    } catch (fallbackError: any) {
      // Avoid unhandled rejection crash if interaction has already expired or been acknowledged
      console.warn(
        `[Interaction] Could not send fallback error reply: ${fallbackError.message}`,
      );
    }
  }
});

// ── 3. GHOST-BUSTER: AUTO-STOP ON EMPTY CHANNEL (WITH 30S GRACE PERIOD) ─
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  const session = sessionManager.getSession(guild.id);
  if (!session) return;

  // Only evaluate if the voice update relates to the active recording channel
  const wasInSessionChannel = oldState.channelId === session.voiceChannelId;
  const isInSessionChannel = newState.channelId === session.voiceChannelId;
  if (!wasInSessionChannel && !isInSessionChannel) return;

  // Inspect raw guild voiceStates cache directly (independent of member caching intents)
  const channelVoiceStates = guild.voiceStates.cache.filter(
    (vs) =>
      vs.channelId === session.voiceChannelId && vs.id !== client.user?.id,
  );
  const humanCount = channelVoiceStates.size;

  // If a non-bot participant just joined the recording channel, proactively subscribe to their audio
  if (
    !wasInSessionChannel &&
    isInSessionChannel &&
    newState.id !== client.user?.id
  ) {
    const memberName =
      newState.member?.displayName || newState.member?.user.username;
    session.receiver.subscribeUser(newState.id, memberName);
    console.log(
      `[SessionManager] Proactively subscribed joining user ${newState.id} (${memberName})`,
    );
  }

  if (humanCount > 0) {
    // If a timer was counting down because channel was momentarily empty, cancel it
    if (session.emptyChannelTimeout) {
      clearTimeout(session.emptyChannelTimeout);
      session.emptyChannelTimeout = undefined;
      console.log(
        `[Ghost-Buster] Human participant present. Cancelled pending auto-stop countdown.`,
      );
    }
  } else {
    // Channel is empty: start a 30-second grace period before auto-finalizing
    if (!session.emptyChannelTimeout) {
      console.log(
        `[Ghost-Buster] Channel is empty for session ${session.meetingId}. Starting 30s grace period...`,
      );
      session.emptyChannelTimeout = setTimeout(async () => {
        // Re-verify after 30 seconds
        const currentActive = guild.voiceStates.cache.filter(
          (vs) =>
            vs.channelId === session.voiceChannelId &&
            vs.id !== client.user?.id,
        );
        if (currentActive.size === 0) {
          console.log(
            `[Ghost-Buster] Grace period expired. Auto-finalizing meeting ${session.meetingId}...`,
          );
          try {
            const textChannel = (await client.channels.fetch(
              session.textChannelId,
            )) as any;
            if (textChannel && "send" in textChannel) {
              await textChannel.send(
                "**All participants left.** Auto-finalizing meeting recording...",
              );
            }
            await sessionManager.stopSession(guild.id);
          } catch (err: any) {
            console.error(
              "[Ghost-Buster] Error during auto-stop:",
              err.message,
            );
          }
        }
      }, 30_000);
    }
  }
});

// ── 4. GRACEFUL SHUTDOWN ──────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(
    `\n[Shutdown] Received ${signal}. Cleaning up active sessions...`,
  );
  client.destroy();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Start client
if (config.DISCORD_BOT_TOKEN) {
  client.login(config.DISCORD_BOT_TOKEN).catch((err) => {
    console.error("Failed to login to Discord:", err.message);
  });
} else {
  console.warn("DISCORD_BOT_TOKEN is not configured. Bot will not login.");
}
