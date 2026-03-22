/**
 * lib/rateLimit.js
 * Anti-abuso para el endpoint de constancias.
 *
 * Almacenamiento:
 *   - LOCAL (NODE_ENV !== "production"): archivo .rate-limit-store.json
 *     Persiste entre reinicios de vercel dev → permite probar el cooldown.
 *   - PRODUCCIÓN (NODE_ENV === "production"): Map en memoria.
 *     Suficiente para el volumen académico del sistema.
 *     Para protección distribuida real → migrar a Upstash Redis.
 *
 * Tres capas:
 *   1. Delay artificial de 1.5 s en toda petición
 *   2. Rate limit por IP: máx 10 req / 15 min
 *   3. Cooldown por número de control: 1 solicitud / 24 horas
 */

import fs from 'fs';
import path from 'path';

// ── Configuración ──────────────────────────────────────────────
const IP_WINDOW_MS = 15 * 60 * 1000;        // 15 minutos
const IP_MAX_REQUESTS = 10;
const NC_COOLDOWN_MS = 24 * 60 * 60 * 1000;   // 24 horas
const DELAY_MS = 1500;

const IS_PROD = process.env.NODE_ENV === 'production';
const STORE_FILE = path.join(process.cwd(), '.rate-limit-store.json');

// ── Stores ────────────────────────────────────────────────────

// En producción: Map en memoria
const ipMap = new Map();
const ncMap = new Map();

// ── Persistencia en archivo (solo desarrollo) ─────────────────

function leerStore() {
    try {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { ip: {}, nc: {} };
    }
}

function guardarStore(store) {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    } catch (e) {
        console.warn('[rateLimit] No se pudo guardar store:', e.message);
    }
}


// ── Helpers ────────────────────────────────────────────────────

export function getIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

export function delay(ms = DELAY_MS) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// ── Check IP ──────────────────────────────────────────────────

export function checkIPRateLimit(ip) {
    const now = Date.now();

    if (IS_PROD) {
        // ── Memoria ──
        const data = ipMap.get(ip);
        if (!data || now - data.windowStart > IP_WINDOW_MS) {
            ipMap.set(ip, { count: 1, windowStart: now });
            return { blocked: false, retryAfterSecs: 0 };
        }
        if (data.count >= IP_MAX_REQUESTS) {
            return { blocked: true, retryAfterSecs: Math.ceil((IP_WINDOW_MS - (now - data.windowStart)) / 1000) };
        }
        data.count++;
        return { blocked: false, retryAfterSecs: 0 };

    } else {
        // ── Archivo ──
        const store = leerStore();
        const data = store.ip[ip];

        if (!data || now - data.windowStart > IP_WINDOW_MS) {
            store.ip[ip] = { count: 1, windowStart: now };
            guardarStore(store);
            return { blocked: false, retryAfterSecs: 0 };
        }
        if (data.count >= IP_MAX_REQUESTS) {
            return { blocked: true, retryAfterSecs: Math.ceil((IP_WINDOW_MS - (now - data.windowStart)) / 1000) };
        }
        store.ip[ip].count++;
        guardarStore(store);
        return { blocked: false, retryAfterSecs: 0 };
    }
}


// ── Check cooldown NC ─────────────────────────────────────────

export function checkNCCooldown(noControl) {
    const now = Date.now();

    if (IS_PROD) {
        // ── Memoria ──
        const last = ncMap.get(noControl);
        if (last && now - last < NC_COOLDOWN_MS) {
            return { blocked: true, retryAfterSecs: Math.ceil((NC_COOLDOWN_MS - (now - last)) / 1000) };
        }
        ncMap.set(noControl, now);
        return { blocked: false, retryAfterSecs: 0 };

    } else {
        // ── Archivo ──
        const store = leerStore();
        const last = store.nc[noControl];

        if (last && now - last < NC_COOLDOWN_MS) {
            return { blocked: true, retryAfterSecs: Math.ceil((NC_COOLDOWN_MS - (now - last)) / 1000) };
        }
        store.nc[noControl] = now;
        guardarStore(store);
        return { blocked: false, retryAfterSecs: 0 };
    }
}


// ── Función principal ─────────────────────────────────────────

export async function applyRateLimit(req, res, noControl) {

    // 1 — Delay siempre
    await delay(DELAY_MS);

    const ip = getIP(req);

    // 2 — Rate limit por IP
    const ipCheck = checkIPRateLimit(ip);
    if (ipCheck.blocked) {
        console.warn(`[rateLimit] IP bloqueada: ${ip} — retry en ${ipCheck.retryAfterSecs}s`);
        res.setHeader('Retry-After', ipCheck.retryAfterSecs);
        res.status(429).json({
            ok: false,
            message: `Demasiadas solicitudes. Intenta de nuevo en ${ipCheck.retryAfterSecs} segundos.`,
        });
        return true;
    }

    // 3 — Cooldown por número de control
    const ncCheck = checkNCCooldown(noControl);
    if (ncCheck.blocked) {
        console.warn(`[rateLimit] Cooldown activo: ${noControl} — retry en ${ncCheck.retryAfterSecs}s`);
        res.setHeader('Retry-After', ncCheck.retryAfterSecs);
        res.status(429).json({
            ok: false,
            message: `Ya se envió una constancia para este número de control hoy. Puedes solicitar otra en ${Math.ceil(ncCheck.retryAfterSecs / 3600)} hora(s).`,
        });
        return true;
    }

    return false;
}