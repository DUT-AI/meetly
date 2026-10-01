Meetly Discord Audio Extractor Bot

Dedicated voice capture and storage service for Meetly. It listens in Discord voice channels, extracts and synchronizes speech from all participants using Discord's **DAVE Protocol (E2EE)**, mixes the tracks via **FFmpeg** into a standardized 16kHz mono MP3, and directly uploads the audio and metadata to **MinIO (S3)**.

> **Chi tiết kiến trúc và quy trình**: Xem tài liệu kỹ thuật đầy đủ tại [ARCHITECTURE_AND_WORKFLOW.md](file:///home/phuqy/Develop/meetly/apps/discord-bot/ARCHITECTURE_AND_WORKFLOW.md).

---

## Features

- **DAVE Protocol E2EE Support**: Compatible with Discord's mandatory voice encryption via `@discordjs/voice` and `@snazzah/davey`.
- **Zero Audio Desync**: Dynamically aligns speech packets and pads silence gaps so multi-speaker playback is 100% time-synchronized.
- **Direct MinIO Ingestion**: Automatically streams finalized audio to the `meetly-uploads` bucket without relying on Discord's 25MB file upload limits.
- **Autonomous Ghost-Buster**: Automatically leaves and finalizes the recording when all human participants leave the channel or after 5 minutes of dead silence.
- **Safety Duration Cap**: Automatically saves and disconnects if a meeting exceeds 3 hours.

---

## Quick Setup

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Under **Bot**, click **Reset Token** and copy your token.
3. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent**
   - **Message Content Intent**
4. Under **OAuth2 -> General**, copy your **Application / Client ID**.

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your credentials:

```env
DISCORD_BOT_TOKEN="your_token_here"
DISCORD_CLIENT_ID="your_client_id_here"
DISCORD_GUILD_ID="your_test_guild_id" # Optional: for instant slash command sync in dev

MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="meetly-uploads"
```

### 3. Deploy Slash Commands

Register `/record`, `/stop`, and `/status`:

```bash
npm run register-commands
```

### 4. Run the Bot

```bash
# Development (with ts-node)
npm run dev

# Production Build
npm run build
npm start
```

### 5. Bot Commands

| Command     | Permissions required | Description                                                             |
| :---------- | :------------------- | :---------------------------------------------------------------------- |
| `/record` | Manage Channels      | Joins your current voice channel and starts capturing audio (ephemeral).|
| `/stop`   | Manage Channels      | Finalizes recording, mixes audio, and uploads to MinIO (ephemeral).    |
| `/status` | Manage Channels      | Displays active recording status and elapsed time (ephemeral).          |
| `/purge`  | Manage Channels/Admin| Permanently deletes a meeting recording from storage (for test cleanup).|
