import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// 1. Load Root .env first if available
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 2. Load Local .env (overrides root if present)
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

// Pre-process and normalize MinIO / S3 parameters matching Meetly conventions
const rawEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const normalizedEndpoint = rawEndpoint.replace(/\/+$/, '');
const isHttps = normalizedEndpoint.startsWith('https://');

const configSchema = z.object({
  // Discord Credentials
  DISCORD_BOT_TOKEN: z.string().min(1, 'DISCORD_BOT_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(),

  // MinIO / S3 Configuration (Supporting both MINIO_ROOT_* and MINIO_ACCESS/SECRET conventions)
  MINIO_ENDPOINT: z.string().default(normalizedEndpoint),
  MINIO_ACCESS_KEY: z.string().default(process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin'),
  MINIO_SECRET_KEY: z.string().default(process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin'),
  MINIO_BUCKET: z.string().default(process.env.DEFAULT_BUCKET || process.env.MINIO_BUCKET || 'meetly-dev'),
  MINIO_USE_SSL: z.boolean().default(
    isHttps || process.env.MINIO_SECURE === 'true' || process.env.MINIO_USE_SSL === 'true'
  ),

  // Operational Safeguards
  MAX_MEETING_DURATION_MINUTES: z
    .string()
    .default(process.env.MAX_MEETING_DURATION_MINUTES || '180')
    .transform((val) => parseInt(val, 10)),
  SILENCE_TIMEOUT_MINUTES: z
    .string()
    .default(process.env.SILENCE_TIMEOUT_MINUTES || '5')
    .transform((val) => parseInt(val, 10)),
  TEMP_DIR: z.string().default(process.env.TEMP_DIR || path.resolve(process.cwd(), 'tmp')),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default(
    (process.env.LOG_LEVEL as any) || 'info'
  ),
  NODE_ENV: z.enum(['development', 'production', 'test']).default(
    (process.env.NODE_ENV as any) || 'development'
  ),
  ENABLE_PREVIEW_URL: z.boolean().default(process.env.ENABLE_PREVIEW_URL === 'true'),
  PREVIEW_URL_EXPIRES_IN_SECONDS: z
    .string()
    .default(process.env.PREVIEW_URL_EXPIRES_IN_SECONDS || '900')
    .transform((val) => parseInt(val, 10)),
});

const parsed = configSchema.safeParse({
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  MINIO_ENDPOINT: normalizedEndpoint,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD,
  MINIO_BUCKET: process.env.DEFAULT_BUCKET || process.env.MINIO_BUCKET,
  MINIO_USE_SSL: isHttps || process.env.MINIO_SECURE === 'true' || process.env.MINIO_USE_SSL === 'true',
  MAX_MEETING_DURATION_MINUTES: process.env.MAX_MEETING_DURATION_MINUTES,
  SILENCE_TIMEOUT_MINUTES: process.env.SILENCE_TIMEOUT_MINUTES,
  TEMP_DIR: process.env.TEMP_DIR,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ENABLE_PREVIEW_URL: process.env.ENABLE_PREVIEW_URL === 'true',
  PREVIEW_URL_EXPIRES_IN_SECONDS: process.env.PREVIEW_URL_EXPIRES_IN_SECONDS || '900',
});

if (!parsed.success) {
  console.warn('[Config] Environment warning: Some required keys may be missing (e.g. DISCORD_BOT_TOKEN).');
  parsed.error.errors.forEach((err) => {
    console.warn(`  - ${err.path.join('.')}: ${err.message}`);
  });
}

export const config = parsed.success
  ? parsed.data
  : ({
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
      DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
      MINIO_ENDPOINT: normalizedEndpoint,
      MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'dutai',
      MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'dutai123',
      MINIO_BUCKET: process.env.DEFAULT_BUCKET || process.env.MINIO_BUCKET || 'meetly-dev',
      MINIO_USE_SSL: isHttps || process.env.MINIO_SECURE === 'true' || process.env.MINIO_USE_SSL === 'true',
      MAX_MEETING_DURATION_MINUTES: parseInt(process.env.MAX_MEETING_DURATION_MINUTES || '180', 10),
      SILENCE_TIMEOUT_MINUTES: parseInt(process.env.SILENCE_TIMEOUT_MINUTES || '5', 10),
      TEMP_DIR: process.env.TEMP_DIR || path.resolve(process.cwd(), 'tmp'),
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      ENABLE_PREVIEW_URL: process.env.ENABLE_PREVIEW_URL === 'true',
      PREVIEW_URL_EXPIRES_IN_SECONDS: parseInt(process.env.PREVIEW_URL_EXPIRES_IN_SECONDS || '900', 10),
    } as z.infer<typeof configSchema>);

export type Config = typeof config;
