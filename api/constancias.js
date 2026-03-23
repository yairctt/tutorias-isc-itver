/**
 * api/constancias.js
 * Endpoint serverless de Vercel.
 *
 * Método:  POST
 * Body:    { noControl: "23020095" }
 *
 * Capas de seguridad (lib/rateLimit.js):
 *   1. Delay artificial de 1.5 s en toda petición
 *   2. Rate limit por IP: máx 10 req / 15 min
 *   3. Cooldown por número de control: 1 solicitud / 24 horas
 *   4. Límite de NCs distintos por IP: máx 2 / 24 horas
 *
 * Seguridad adicional:
 *   5. CORS restringido al dominio oficial
 *   6. IP real via x-vercel-forwarded-for (no falsificable)
 */

import { existeConstancia, getPdfBuffer } from '../lib/r2.js';
import { enviarConstancia, toCorreo } from '../lib/mail.js';
import { applyRateLimit } from '../lib/ratelimit.js';

const RE_NO_CONTROL = /^\d{8}$/;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {

  /* ── CORS ── */
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  /* ── CORS preflight ── */
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  /* ── Solo POST ── */
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  }

  /* ── Parsear body ── */
  let body = req.body;

  if (!body || typeof body === 'string') {
    try {
      const raw = typeof body === 'string'
        ? body
        : await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({ ok: false, message: 'Body JSON inválido.' });
    }
  }

  /* ── Validar noControl ── */
  const { noControl } = body ?? {};

  if (!noControl || typeof noControl !== 'string') {
    return res.status(400).json({ ok: false, message: 'Se requiere el campo noControl.' });
  }

  const nc = noControl.trim();

  if (!RE_NO_CONTROL.test(nc)) {
    return res.status(400).json({
      ok: false,
      message: 'El número de control debe contener exactamente 8 dígitos numéricos.',
    });
  }

  /* ── Seguridad: delay + rate limit por IP + cooldown por NC ── */
  const bloqueado = await applyRateLimit(req, res, nc);
  if (bloqueado) return;

  /* ── Buscar en R2 y enviar correo ── */
  try {
    const existe = await existeConstancia(nc);

    if (!existe) {
      return res.status(404).json({
        ok: false,
        message: `No se encontró una constancia para el número de control ${nc}. Verifica que hayas acreditado el programa de tutorías.`,
      });
    }

    const pdfBuffer = await getPdfBuffer(nc);
    await enviarConstancia(nc, pdfBuffer);

    console.log(`[constancias] OK → ${toCorreo(nc)}`);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[constancias] Error interno:', err);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error interno. Intenta de nuevo más tarde.',
    });
  }
}