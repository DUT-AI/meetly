import { REST, Routes } from 'discord.js';
import { config } from './config';
import { recordCommand } from './commands/record';
import { stopCommand } from './commands/stop';
import { statusCommand } from './commands/status';
import { purgeCommand } from './commands/purge';

const commands = [
  recordCommand.data.toJSON(),
  stopCommand.data.toJSON(),
  statusCommand.data.toJSON(),
  purgeCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);

export async function registerSlashCommands(): Promise<void> {
  try {
    console.log(`[Commands] Deploying ${commands.length} application (/) commands...`);

    if (config.DISCORD_GUILD_ID) {
      // Guild-specific registration (updates instantly for development)
      await rest.put(
        Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log(`[Commands] Successfully registered commands for guild: ${config.DISCORD_GUILD_ID}`);
    } else {
      // Global registration
      await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
        body: commands,
      });
      console.log('[Commands] Successfully registered global commands.');
    }
  } catch (error) {
    console.error('[Commands] Error deploying slash commands:', error);
  }
}

// Allow running directly via `npm run register-commands`
if (require.main === module) {
  registerSlashCommands();
}
