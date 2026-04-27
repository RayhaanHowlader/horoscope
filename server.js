// ============================================================
// server.js — Celestial Elite proxy server
// Auth: x-astrologyapi-key: <access_token>
// Run: node server.js  →  open http://localhost:3000
// ============================================================

require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app   = express();
const PORT  = process.env.PORT || 3000;
const TOKEN = process.env.ASTRO_ACCESS_TOKEN;
const BASE  = 'https://json.astrologyapi.com/v1';

if (!TOKEN || TOKEN === 'YOUR_ACCESS_TOKEN') {
  console.warn('\n⚠  Set ASTRO_ACCESS_TOKEN in .env\n');
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Astrology API proxy ──────────────────────────────────────
// All endpoints: POST /api/<endpoint>
// Forwards to AstrologyAPI with x-astrologyapi-key header
app.post('/api/*', async (req, res) => {
  const endpoint = req.params[0];
  const url      = `${BASE}/${endpoint}`;

  try {
    const upstream = await fetch(url, {
      method:  'POST',
      headers: {
        'x-astrologyapi-key': TOKEN,
        'Content-Type':       'application/json',
        'Accept-Language':    'en',
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();

    // Try to parse JSON, return raw text on failure
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(upstream.status).send(text); }

    if (!upstream.ok) {
      console.error(`[API ${upstream.status}] ${endpoint}:`, text.substring(0, 200));
      return res.status(upstream.status).json({ error: true, message: data?.message || text });
    }

    res.json(data);
  } catch (err) {
    console.error(`[Proxy Error] ${endpoint}:`, err.message);
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── Geocoding proxy (OpenStreetMap Nominatim) ────────────────
app.get('/geo', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const r    = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'CelestialElite/1.0' }
    });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Timezone proxy (timeapi.io) ──────────────────────────────
app.get('/tz', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });
  try {
    const r    = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
    res.json(await r.json());
  } catch {
    res.json({ currentUtcOffset: { seconds: 19800 } }); // fallback IST
  }
});

// ── Gemini Chat proxy ────────────────────────────────────────
// Tries models in order, retries once on 429 after a short delay
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

async function callGemini(key, model, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  return { status: res.status, data: await res.json() };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.post('/chat', async (req, res) => {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const { messages, systemPrompt } = req.body;

  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set in .env' });

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
  };

  for (const model of GEMINI_MODELS) {
    try {
      let { status, data } = await callGemini(GEMINI_KEY, model, payload);

      // On 429, wait 5s and retry once with same model
      if (status === 429) {
        console.warn(`[Gemini] 429 on ${model}, retrying in 5s...`);
        await sleep(5000);
        ({ status, data } = await callGemini(GEMINI_KEY, model, payload));
      }

      if (status === 200) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
        console.log(`[Gemini] OK using ${model}`);
        return res.json({ text });
      }

      // 429 again or other error — try next model
      console.warn(`[Gemini] ${status} on ${model}, trying next...`);

    } catch (err) {
      console.warn(`[Gemini] Error on ${model}:`, err.message);
    }
  }

  // All models failed
  return res.status(429).json({
    error: true,
    message: 'All Gemini models are rate-limited right now. Please wait a minute and try again.'
  });
});

// ── Fallback ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✦ Celestial Elite running at http://localhost:${PORT}\n`);
  });
}

module.exports = app;
