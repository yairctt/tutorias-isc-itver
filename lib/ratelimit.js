/**
 * lib/rateLimit.js
 * Anti-abuso para el endpoint de constancias.
 *
 * Almacenamiento:
 *   - LOCAL (NODE_ENV !== "production"): archivo .rate-limit-store.json
 *   - PRODUCCIÓN: Upstash Redis (distribuido, persiste entre instancias)
 *
 * Cuatro capas:
 *   1. Delay artificial de 1.5 s en toda petición
 *   2. Rate limit por IP: máx 10 req / 15 min
 *   3. Cooldown por número de control: 1 solicitud / 24 horas
 *   4. Límite de NCs distintos por IP: máx 2 / 24 horas
 */

import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

// ── Configuración ──────────────────────────────────────────────
const IP_WINDOW_MS = 15 * 60 * 1000;
const IP_WINDOW_SECS = 15 * 60;
const IP_MAX_REQUESTS = 10;

const NC_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NC_COOLDOWN_SECS = 24 * 60 * 60;

const IP_NC_MAX = 2;
const IP_NC_SECS = 24 * 60 * 60;

const DELAY_MS = 1500;

const IS_PROD = process.env.NODE_ENV === 'production';
const STORE_FILE = path.join(process.cwd(), '.rate-limit-store.json');

// ── Redis (solo producción) ────────────────────────────────────
let redis = null;
if (IS_PROD) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

// ── Persistencia en archivo (solo desarrollo) ─────────────────

function leerStore() {
    try {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { ip: {}, nc: {}, ipnc: {} };
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

export async function checkIPRateLimit(ip) {
    const now = Date.now();

    if (IS_PROD) {
        // ── Upstash Redis ──
        const key = `rl:ip:${ip}`;
        const count = await redis.incr(key);
        if (count === 1) {
            await redis.expire(key, IP_WINDOW_SECS);
        }
        if (count > IP_MAX_REQUESTS) {
            const ttl = await redis.ttl(key);
            return { blocked: true, retryAfterSecs: ttl > 0 ? ttl : IP_WINDOW_SECS };
        }
        return { blocked: false, retryAfterSecs: 0 };

    } else {
        // ── Archivo local ──
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

// ── Check cooldown NC + límite de NCs por IP ──────────────────

export async function checkNCCooldown(noControl, ip) {
    const now = Date.now();

    if (IS_PROD) {
        // ── 1. Cooldown del número de control ──
        const keyNC = `rl:nc:${noControl}`;
        const set = await redis.set(keyNC, now, { nx: true, ex: NC_COOLDOWN_SECS });
        if (set === null) {
            // Ya existe → cooldown activo
            const ttl = await redis.ttl(keyNC);
            return {
                blocked: true,
                retryAfterSecs: ttl > 0 ? ttl : NC_COOLDOWN_SECS,
                reason: 'nc-cooldown'
            };
        }

        // ── 2. Límite de NCs distintos por IP ──
        const keyIPNC = `rl:ip-nc:${ip}`;
        const ncs = await redis.incr(keyIPNC);
        if (ncs === 1) {
            await redis.expire(keyIPNC, IP_NC_SECS);
        }
        if (ncs > IP_NC_MAX) {
            // Revierte el registro del NC para no gastar el cooldown
            await redis.del(keyNC);
            const ttl = await redis.ttl(keyIPNC);
            return {
                blocked: true,
                retryAfterSecs: ttl > 0 ? ttl : IP_NC_SECS,
                reason: 'ip-nc-limit'
            };
        }

        return { blocked: false, retryAfterSecs: 0 };

    } else {
        // ── Archivo local ──
        const store = leerStore();
        if (!store.ipnc) store.ipnc = {};

        // 1. Cooldown del número de control
        const last = store.nc[noControl];
        if (last && now - last < NC_COOLDOWN_MS) {
            return {
                blocked: true,
                retryAfterSecs: Math.ceil((NC_COOLDOWN_MS - (now - last)) / 1000),
                reason: 'nc-cooldown'
            };
        }

        // 2. Límite de NCs distintos por IP
        const ipData = store.ipnc[ip];
        if (!ipData || now - ipData.windowStart > IP_NC_SECS * 1000) {
            store.ipnc[ip] = { count: 1, windowStart: now };
        } else if (ipData.count >= IP_NC_MAX) {
            return {
                blocked: true,
                retryAfterSecs: Math.ceil((IP_NC_SECS * 1000 - (now - ipData.windowStart)) / 1000),
                reason: 'ip-nc-limit'
            };
        } else {
            store.ipnc[ip].count++;
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
    const ipCheck = await checkIPRateLimit(ip);
    if (ipCheck.blocked) {
        console.warn(`[rateLimit] IP bloqueada: ${ip} — retry en ${ipCheck.retryAfterSecs}s`);
        res.setHeader('Retry-After', ipCheck.retryAfterSecs);
        res.status(429).json({
            ok: false,
            message: `Demasiadas solicitudes. Intenta de nuevo en ${ipCheck.retryAfterSecs} segundos.`,
        });
        return true;
    }

    // 3 — Cooldown por número de control + límite de NCs por IP
    const ncCheck = await checkNCCooldown(noControl, ip);
    if (ncCheck.blocked) {
        console.warn(`[rateLimit] Bloqueado: ${noControl} (${ncCheck.reason}) — retry en ${ncCheck.retryAfterSecs}s`);
        res.setHeader('Retry-After', ncCheck.retryAfterSecs);

        const mensaje = ncCheck.reason === 'ip-nc-limit'
            ? `Tu dispositivo ya consultó ${IP_NC_MAX} números de control hoy. Intenta mañana.`
            : `Ya se envió una constancia para este número de control hoy. Puedes solicitar otra en ${Math.ceil(ncCheck.retryAfterSecs / 3600)} hora(s).`;

        res.status(429).json({ ok: false, message: mensaje });
        return true;
    }

    return false;
}