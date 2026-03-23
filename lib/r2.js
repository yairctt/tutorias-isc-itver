/**
 * lib/r2.js
 * Cliente de Cloudflare R2 usando el SDK de S3 de AWS.
 *
 * Variables de entorno requeridas:
 *   R2_ACCOUNT_ID       → ID de cuenta de Cloudflare
 *   R2_BUCKET_NAME      → Nombre del bucket
 *   R2_ACCESS_KEY_ID    → Access key ID del token R2
 *   R2_SECRET_ACCESS_KEY→ Secret access key del token R2
 */

import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const IS_DEV = process.env.NODE_ENV !== 'production';

const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Logs de diagnóstico solo en desarrollo
if (IS_DEV) {
  console.log('[r2] endpoint:', endpoint);
  console.log('[r2] bucket:  ', process.env.R2_BUCKET_NAME);
  console.log('[r2] key id:  ', process.env.R2_ACCESS_KEY_ID?.slice(0, 8) + '...');
}

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

  if (IS_DEV) console.log('[r2] HeadObject →', BUCKET, key);

  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (IS_DEV) console.log('[r2] HeadObject error:', err.name, err.$metadata?.httpStatusCode);

    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }

    // En producción loguea de forma estructurada
    console.error(JSON.stringify({
      event: 'r2_error',
      operacion: 'HeadObject',
      key,
      error: err.name,
      status: err.$metadata?.httpStatusCode,
      timestamp: new Date().toISOString(),
    }));

    throw err;
  }
}

export async function getPdfBuffer(noControl) {
  const key = buildKey(noControl);

  if (IS_DEV) console.log('[r2] GetObject →', BUCKET, key);

  try {
    const response = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);

  } catch (err) {
    console.error(JSON.stringify({
      event: 'r2_error',
      operacion: 'GetObject',
      key,
      error: err.name,
      status: err.$metadata?.httpStatusCode,
      timestamp: new Date().toISOString(),
    }));

    throw err;
  }
}