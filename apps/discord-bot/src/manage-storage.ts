import fs from 'fs';
import path from 'path';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { config } from './config';

const client = new S3Client({
  endpoint: config.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.MINIO_ACCESS_KEY,
    secretAccessKey: config.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
  tls: config.MINIO_USE_SSL,
});

const bucket = config.MINIO_BUCKET;

async function listMeetings() {
  console.log(`\nListing recordings in bucket: '${bucket}' (Endpoint: ${config.MINIO_ENDPOINT})...\n`);
  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'meetings/',
      })
    );

    if (!response.Contents || response.Contents.length === 0) {
      console.log('No meetings found in storage.');
      return;
    }

    const meetingMap = new Map<string, { size: number; files: string[] }>();
    for (const item of response.Contents) {
      if (!item.Key) continue;
      const parts = item.Key.split('/');
      const meetingId = parts[1];
      if (!meetingId) continue;

      if (!meetingMap.has(meetingId)) {
        meetingMap.set(meetingId, { size: 0, files: [] });
      }
      const data = meetingMap.get(meetingId)!;
      data.size += item.Size || 0;
      data.files.push(parts.slice(2).join('/'));
    }

    console.log(`Found ${meetingMap.size} meeting(s):`);
    console.log('------------------------------------------------------------');
    for (const [id, info] of meetingMap.entries()) {
      const sizeMB = (info.size / (1024 * 1024)).toFixed(2);
      console.log(`• Meeting ID: ${id}`);
      console.log(`  Size      : ${sizeMB} MB`);
      console.log(`  Files     : ${info.files.join(', ')}`);
      console.log('------------------------------------------------------------');
    }
  } catch (err: any) {
    console.error('Failed to list meetings:', err.message);
  }
}

async function downloadMeeting(meetingId: string, outputDir: string = './downloads') {
  const audioKey = `meetings/${meetingId}/audio.mp3`;
  const metadataKey = `meetings/${meetingId}/metadata.json`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const destPath = path.resolve(outputDir, `${meetingId}.mp3`);
  console.log(`\nDownloading audio for meeting '${meetingId}' to:\n  ${destPath}...`);

  try {
    const audioRes = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: audioKey,
      })
    );

    const stream = audioRes.Body as Readable;
    const writeStream = fs.createWriteStream(destPath);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    console.log(`Successfully downloaded: ${destPath}`);

    // Optional: download metadata if present
    try {
      const metaRes = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: metadataKey,
        })
      );
      const metaStream = metaRes.Body as Readable;
      const metaDestPath = path.resolve(outputDir, `${meetingId}_metadata.json`);
      const metaWriteStream = fs.createWriteStream(metaDestPath);
      await new Promise<void>((resolve, reject) => {
        metaStream.pipe(metaWriteStream);
        metaWriteStream.on('finish', () => resolve());
        metaWriteStream.on('error', reject);
      });
      console.log(`Metadata downloaded: ${metaDestPath}`);
    } catch {
      // Metadata not found or optional
    }
  } catch (err: any) {
    console.error(`Failed to download meeting '${meetingId}':`, err.message);
  }
}

async function deleteMeeting(meetingId: string) {
  console.log(`\nDeleting files for meeting '${meetingId}' from bucket '${bucket}'...`);
  try {
    // List all objects for this meeting
    const listRes = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `meetings/${meetingId}/`,
      })
    );

    if (!listRes.Contents || listRes.Contents.length === 0) {
      console.log(`No files found under 'meetings/${meetingId}/'.`);
      return;
    }

    const deleteObjects = listRes.Contents.map((obj) => ({ Key: obj.Key }));
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: deleteObjects },
      })
    );

    console.log(`Successfully deleted ${deleteObjects.length} object(s):`);
    deleteObjects.forEach((obj) => console.log(`  - ${obj.Key}`));
  } catch (err: any) {
    console.error(`Failed to delete meeting '${meetingId}':`, err.message);
  }
}

async function main() {
  const [action, targetId] = process.argv.slice(2);

  if (!action || action === 'help' || action === '--help') {
    console.log(`
Meetly Storage Management CLI
-----------------------------
Usage:
  npm run storage list
  npm run storage download <meetingId>
  npm run storage delete <meetingId>

Examples:
  npm run storage list
  npm run storage download 0195c621-3a55-7000-8000-112233445566
  npm run storage delete 0195c621-3a55-7000-8000-112233445566
`);
    return;
  }

  if (action === 'list') {
    await listMeetings();
  } else if (action === 'download') {
    if (!targetId) {
      console.error('Error: Meeting ID is required. Example: npm run storage download <meetingId>');
      process.exit(1);
    }
    await downloadMeeting(targetId);
  } else if (action === 'delete') {
    if (!targetId) {
      console.error('Error: Meeting ID is required. Example: npm run storage delete <meetingId>');
      process.exit(1);
    }
    await deleteMeeting(targetId);
  } else {
    console.error(`Unknown action: '${action}'. Run with --help for usage.`);
  }
}

main();
