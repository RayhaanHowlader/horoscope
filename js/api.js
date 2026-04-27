// ============================================================
// api.js — calls the local proxy server (server.js)
//
// Browser → localhost:3000/api/<endpoint> → astrologyapi.com
//
// This avoids CORS. Credentials stay server-side in .env
// ============================================================

/**
 * POST via Basic Auth proxy
 * Endpoint examples: 'planets', 'astro_details', 'birth_details',
 *   'match_making_detailed_report', 'match_astro_details',
 *   'sun_sign_prediction/daily/aries'
 */
async function callAstroAPI(endpoint, body = {}) {
  const res = await fetch(`/api/${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }

  // planets endpoint wraps array in { value: [...], Count: N }
  // unwrap it so callers always get a plain array
  if (data && data.value && Array.isArray(data.value)) {
    return data.value;
  }

  return data;
}

/**
 * POST via Access Token proxy (wallet/chat APIs)
 */
async function callAstroAPIWithToken(endpoint, body = {}) {
  const res = await fetch(`/api-token/${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

// ============================================================
// Payload builders — exact field names per API docs
// ============================================================

/**
 * Single person: { day, month, year, hour, min, lat, lon, tzone }
 */
function buildBirthPayload(dob, tob, lat, lon, tzone) {
  const [year, month, day] = dob.split('-').map(Number);
  const [hour, min]        = tob.split(':').map(Number);
  return {
    day, month, year,
    hour, min,
    lat:   parseFloat(lat),
    lon:   parseFloat(lon),
    tzone: parseFloat(tzone),
  };
}

/**
 * Match making: m_ and f_ prefixed fields
 * { m_day, m_month, m_year, m_hour, m_min, m_lat, m_lon, m_tzone,
 *   f_day, f_month, f_year, f_hour, f_min, f_lat, f_lon, f_tzone }
 */
function buildMatchPayload(mDob, mTob, mLat, mLon, mTzone, fDob, fTob, fLat, fLon, fTzone) {
  const [mYear, mMonth, mDay] = mDob.split('-').map(Number);
  const [mHour, mMin]         = mTob.split(':').map(Number);
  const [fYear, fMonth, fDay] = fDob.split('-').map(Number);
  const [fHour, fMin]         = fTob.split(':').map(Number);
  return {
    m_day: mDay, m_month: mMonth, m_year: mYear,
    m_hour: mHour, m_min: mMin,
    m_lat: parseFloat(mLat), m_lon: parseFloat(mLon), m_tzone: parseFloat(mTzone),
    f_day: fDay, f_month: fMonth, f_year: fYear,
    f_hour: fHour, f_min: fMin,
    f_lat: parseFloat(fLat), f_lon: parseFloat(fLon), f_tzone: parseFloat(fTzone),
  };
}

// ============================================================
// Geocoding — via local proxy to avoid CORS
// ============================================================
async function geocodePlace(query) {
  const res = await fetch(`/geo?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Geocoding failed');
  return res.json();
}

async function getTimezone(lat, lon) {
  try {
    const res  = await fetch(`/tz?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    return (data.currentUtcOffset?.seconds ?? 19800) / 3600;
  } catch {
    return 5.5; // fallback IST
  }
}

// ============================================================
// Autocomplete — place search with lat/lon/tz fill
// ============================================================
function setupAutocomplete(inputId, suggestionsId, latId, lonId, tzId) {
  const input       = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);
  if (!input || !suggestions) return;

  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const val = input.value.trim();
    if (val.length < 3) { suggestions.classList.add('hidden'); return; }

    timer = setTimeout(async () => {
      try {
        const results = await geocodePlace(val);
        suggestions.innerHTML = '';
        if (!results.length) { suggestions.classList.add('hidden'); return; }

        results.forEach(r => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          const parts = r.display_name.split(',');
          item.textContent = parts.slice(0, 3).join(',').trim();
          item.title = r.display_name;

          item.addEventListener('click', async () => {
            input.value = parts.slice(0, 3).join(',').trim();
            document.getElementById(latId).value = r.lat;
            document.getElementById(lonId).value = r.lon;
            suggestions.classList.add('hidden');
            const tz = await getTimezone(r.lat, r.lon);
            document.getElementById(tzId).value = tz;
          });
          suggestions.appendChild(item);
        });
        suggestions.classList.remove('hidden');
      } catch {
        suggestions.classList.add('hidden');
      }
    }, 400);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add('hidden');
    }
  });
}
