import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { config } from '../config';

export class MinioStorageClient {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.MINIO_BUCKET;
    this.client = new S3Client({
      endpoint: config.MINIO_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.MINIO_ACCESS_KEY,
        secretAccessKey: config.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Crucial for MinIO compatibility
      tls: config.MINIO_USE_SSL,
    });
  }

  /**
   * Verifies bucket exists or creates it if absent.
   */
  async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      console.log(`[Storage] MinIO bucket '${this.bucket}' is ready.`);
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        console.log(`[Storage] Bucket '${this.bucket}' not found. Attempting to create...`);
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`[Storage] Created bucket '${this.bucket}'.`);
        } catch (createErr: any) {
          console.warn(`[Storage] Could not auto-create bucket '${this.bucket}': ${createErr.message}`);
          console.warn(`[Storage] Please ensure bucket '${this.bucket}' is created in MinIO Console / Web UI.`);
        }
      } else {
        console.warn(`[Storage] Could not verify bucket '${this.bucket}': ${err.message}`);
      }
    }
  }

  /**
   * Uploads a localized audio file to MinIO.
   * @param filePath Local path to finalized audio file
   * @param s3Key Target S3 object key (e.g. meetings/{meetingId}/audio.mp3)
   * @param contentType MIME type (default audio/mpeg)
   */
  async uploadFile(
    filePath: string,
    s3Key: string,
    contentType: string = 'audio/mpeg'
  ): Promise<{ s3Key: string; s3Uri: string; presignedUrl: string }> {
    const fileStream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);

    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileStream,
      ContentLength: stats.size,
      ContentType: contentType,
    });

    await this.client.send(uploadCommand);
    const s3Uri = `s3://${this.bucket}/${s3Key}`;
    console.log(`[Storage] Successfully uploaded ${stats.size} bytes to ${s3Uri}`);

    // Generate a short-lived presigned URL for testing/playback only if explicitly enabled
    let presignedUrl = '';
    if (config.ENABLE_PREVIEW_URL) {
      try {
        const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
        presignedUrl = await getSignedUrl(this.client, getCommand, {
          expiresIn: config.PREVIEW_URL_EXPIRES_IN_SECONDS,
        });
      } catch (e) {
        console.warn('[Storage] Could not generate presigned URL:', e);
      }
    }

    return { s3Key, s3Uri, presignedUrl };
  }

  /**
   * Deletes all objects belonging to a meeting under meetings/{meetingId}/
   */
  async deleteMeeting(meetingId: string): Promise<number> {
    const cleanId = meetingId.trim().replace(/^meetings\//, '').replace(/\/.*$/, '');
    const prefix = `meetings/${cleanId}/`;

    const listRes = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    if (!listRes.Contents || listRes.Contents.length === 0) {
      return 0;
    }

    const deleteObjects = listRes.Contents.map((obj) => ({ Key: obj.Key }));
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: deleteObjects },
      })
    );

    console.log(`[Storage] Deleted ${deleteObjects.length} objects for meeting ${cleanId}`);
    return deleteObjects.length;
  }
}

export const storageClient = new MinioStorageClient();
