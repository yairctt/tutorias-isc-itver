/**
 * lib/r2.js
 * Cliente de Cloudflare R2 usando el SDK de S3 de AWS.
 */

import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Log de diagnóstico — solo en desarrollo
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
console.log('[r2] endpoint:', endpoint);
console.log('[r2] bucket:  ', process.env.R2_BUCKET_NAME);
console.log('[r2] key id:  ', process.env.R2_ACCESS_KEY_ID?.slice(0, 8) + '...');

const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.R2_BUCKET_NAME;

export function buildKey(noControl) {
  const anio = noControl.slice(0, 2);
  return `constancias/${anio}/${noControl}.pdf`;
}

export async function existeConstancia(noControl) {
  const key = buildKey(noControl);
  console.log('[r2] HeadObject →', BUCKET, key);

  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    console.log('[r2] HeadObject error:', err.name, err.$metadata?.httpStatusCode);
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

export async function getPdfBuffer(noControl) {
  const key = buildKey(noControl);
  console.log('[r2] GetObject →', BUCKET, key);

  const response = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}