// ============================================================
// birth-chart.js
// API endpoints used (all POST, Basic Auth):
//   /planets       → id, name, fullDegree, normDegree, speed, isRetro,
//                    sign, signLord, nakshatra, nakshatraLord,
//                    nakshatra_pad, house, is_planet_set, planet_awastha
//   /astro_details → ascendant, Varna, Vashya, Yoni, Gan, Nadi,
//                    SignLord, sign, Naksahtra, NaksahtraLord, Charan,
//                    Yog, Karan, Tithi, yunja, tatva, name_alphabet, paya
//   /birth_details → year, month, day, hour, min, lat, lon, tzone,
//                    sunrise, sunset, ayanamsha
// Payload: { day, month, year, hour, min, lat, lon, tzone }
// ============================================================

const SIGN_SYMBOLS_MAP = {
  Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',
  Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓'
};

const PLANET_META = {
  Sun:     {icon:'sunny',                color:'text-yellow-400',bg:'bg-yellow-400/10', label:'Sun Sign (Soul)',    desc:'Core identity, ego, and life purpose.'},
  Moon:    {icon:'bedtime',              color:'text-blue-300',  bg:'bg-blue-300/10',   label:'Moon Sign (Mind)',   desc:'Emotional nature, instincts, and subconscious.'},
  Mars:    {icon:'local_fire_department',color:'text-red-400',   bg:'bg-red-400/10',    label:'Mars (Drive)',       desc:'Ambition, courage, and how you take action.'},
  Mercury: {icon:'psychology',           color:'text-green-400', bg:'bg-green-400/10',  label:'Mercury (Intellect)',desc:'Communication style and analytical thinking.'},
  Jupiter: {icon:'expand_circle_down',   color:'text-orange-300',bg:'bg-orange-300/10', label:'Jupiter (Wisdom)',   desc:'Growth, luck, and philosophical outlook.'},
  Venus:   {icon:'favorite',             color:'text-pink-400',  bg:'bg-pink-400/10',   label:'Venus (Love)',       desc:'Approach to love, beauty, and relationships.'},
  Saturn:  {icon:'circle',               color:'text-slate-400', bg:'bg-slate-400/10',  label:'Saturn (Karma)',     desc:'Discipline, challenges, and karmic lessons.'},
  Rahu:    {icon:'north',                color:'text-purple-400',bg:'bg-purple-400/10', label:'Rahu (North Node)',  desc:'Karmic direction and worldly desires.'},
  Ketu:    {icon:'south',                color:'text-indigo-400',bg:'bg-indigo-400/10', label:'Ketu (South Node)',  desc:'Past karma and spiritual liberation path.'},
};

const SIGN_KEYWORDS = {
  Aries:'bold initiative and courageous action',Taurus:'patient determination and sensory awareness',
  Gemini:'quick wit and versatile communication',Cancer:'deep emotional sensitivity and nurturing care',
  Leo:'creative self-expression and natural leadership',Virgo:'meticulous analysis and practical service',
  Libra:'balanced judgment and harmonious relationships',Scorpio:'intense focus and transformative power',
  Sagittarius:'expansive vision and philosophical wisdom',Capricorn:'disciplined ambition and structured achievement',
  Aquarius:'innovative thinking and humanitarian ideals',Pisces:'compassionate intuition and spiritual depth'
};

let currentChartData = null;

document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('place', 'place-suggestions', 'lat', 'lon', 'tz');
});

async function generateChart() {
  const name  = document.getElementById('name').value.trim();
  const dob   = document.getElementById('dob').value;
  const tob   = document.getElementById('tob').value;
  const lat   = document.getElementById('lat').value;
  const lon   = document.getElementById('lon').value;
  const tz    = document.getElementById('tz').value;
  const place = document.getElementById('place').value.trim();

  clearError();
  if (!name)        return showError('Please enter your full name.');
  if (!dob)         return showError('Please select your date of birth.');
  if (!tob)         return showError('Please enter your time of birth.');
  if (!lat || !lon) return showError('Please select a place of birth from the dropdown suggestions.');

  setLoading(true);

  try {
    // Build payload per API docs: { day, month, year, hour, min, lat, lon, tzone }
    const payload = buildBirthPayload(dob, tob, lat, lon, tz || '5.5');

    // Fetch all three endpoints in parallel
    const [planetsData, astroData, birthData] = await Promise.all([
      callAstroAPI('planets', payload),
      callAstroAPI('astro_details', payload),
      callAstroAPI('birth_details', payload)
    ]);

    currentChartData = { name, dob, tob, place, payload, planetsData, astroData, birthData };
    renderResults(currentChartData);

  } catch (err) {
    showError('API call failed. Check your credentials in js/config.js. ' + err.message);
    setLoading(false);
  }
}

function renderResults({ name, dob, place, planetsData, astroData, birthData }) {
  setLoading(false);
  document.getElementById('results').classList.remove('hidden');

  const dobFormatted = new Date(dob + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('result-subtitle').textContent =
    `${name} · ${dobFormatted} · ${place.split(',')[0]}`;

  // Ascendant sign number (1-12) from planets array
  // API returns Ascendant as last item with name "Ascendant"
  const ascPlanet = planetsData.find(p => p.name === 'Ascendant');
  const ascSignNum = ascPlanet ? getSignNumber(ascPlanet.sign) : 1;

  drawKundliChart('kundli-svg', planetsData, ascSignNum);
  renderPlanetTable(planetsData);
  renderCoreSigns(planetsData, ascPlanet);
  renderAstroDetails(astroData, birthData);
  renderInterpretations(planetsData);

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Init chatbot AFTER all data is rendered
  initChatbot(currentChartData);
}

// ============================================================
// Planet Table — uses exact API response fields
// ============================================================
function renderPlanetTable(planets) {
  const tbody = document.getElementById('planet-table-body');
  tbody.innerHTML = '';
  planets.forEach(p => {
    if (p.name === 'Ascendant') return;
    // isRetro comes as string "true"/"false" from API
    const isRetro = p.isRetro === 'true' || p.isRetro === true;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-container-high/50 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-4 font-label text-on-surface">${p.name}</td>
      <td class="py-3 px-4 text-primary">${SIGN_SYMBOLS_MAP[p.sign] || ''} ${p.sign || '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${p.normDegree ? p.normDegree.toFixed(2) + '°' : '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant">${p.house || '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${p.nakshatra || '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${p.planet_awastha || '-'}</td>
      <td class="py-3 px-4">
        ${isRetro
          ? '<span class="text-xs px-2 py-1 rounded-full bg-red-900/20 text-red-400">Retrograde</span>'
          : '<span class="text-xs text-green-400">Direct</span>'}
      </td>`;
    tbody.appendChild(tr);
  });
}

// ============================================================
// Core Signs — Sun, Moon, Ascendant
// ============================================================
function renderCoreSigns(planets, ascPlanet) {
  const container = document.getElementById('core-signs');
  container.innerHTML = '';
  const sun  = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');

  [
    { label:'Sun Sign (Soul)',    icon:'sunny',     color:'text-yellow-400', bg:'bg-yellow-400/10', planet: sun },
    { label:'Moon Sign (Mind)',   icon:'bedtime',   color:'text-blue-300',   bg:'bg-blue-300/10',   planet: moon },
    { label:'Ascendant (Lagna)', icon:'north_east', color:'text-tertiary',   bg:'bg-tertiary/10',   planet: ascPlanet },
  ].forEach(item => {
    if (!item.planet) return;
    const sign = item.planet.sign || '-';
    const div = document.createElement('div');
    div.className = 'bg-surface-bright/30 backdrop-blur-md p-6 rounded-xl border-t border-outline-variant/20 shadow-lg';
    div.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="p-3 ${item.bg} rounded-lg ${item.color} shrink-0">
          <span class="material-symbols-outlined">${item.icon}</span>
        </div>
        <div>
          <h4 class="font-label text-xs uppercase tracking-widest text-secondary mb-1">${item.label}</h4>
          <h3 class="font-headline text-2xl text-on-surface mb-1">${SIGN_SYMBOLS_MAP[sign] || ''} ${sign}</h3>
          <p class="font-body text-xs text-on-surface-variant mb-1">Nakshatra: <span class="text-on-surface">${item.planet.nakshatra || '-'}</span></p>
          <p class="font-body text-sm text-on-surface-variant leading-relaxed">${SIGN_KEYWORDS[sign] ? 'Energy of ' + SIGN_KEYWORDS[sign] + '.' : ''}</p>
        </div>
      </div>`;
    container.appendChild(div);
  });
}

// ============================================================
// Astro Details — exact field names from API docs
// astro_details: ascendant, Varna, Vashya, Yoni, Gan, Nadi,
//   SignLord, sign, Naksahtra, NaksahtraLord, Charan, Yog,
//   Karan, Tithi, yunja, tatva, name_alphabet, paya
// birth_details: sunrise, sunset, ayanamsha
// ============================================================
function renderAstroDetails(astroData, birthData) {
  if (!astroData) return;
  const card    = document.getElementById('astro-details-card');
  const content = document.getElementById('astro-details-content');
  card.classList.remove('hidden');
  content.innerHTML = '';

  const fields = [
    ['Ascendant',      astroData.ascendant],
    ['Rashi (Sign)',   astroData.sign],
    ['Nakshatra',      astroData.Naksahtra],
    ['Nakshatra Lord', astroData.NaksahtraLord],
    ['Charan (Pada)',  astroData.Charan],
    ['Tithi',          astroData.Tithi],
    ['Yoga',           astroData.Yog],
    ['Karan',          astroData.Karan],
    ['Varna',          astroData.Varna],
    ['Vashya',         astroData.Vashya],
    ['Yoni',           astroData.Yoni],
    ['Gan',            astroData.Gan],
    ['Nadi',           astroData.Nadi],
    ['Tatva',          astroData.tatva],
    ['Name Alphabet',  astroData.name_alphabet],
    ['Paya',           astroData.paya],
    ['Yunja',          astroData.yunja],
    ['Sign Lord',      astroData.SignLord],
  ];

  if (birthData) {
    fields.push(
      ['Sunrise',   birthData.sunrise],
      ['Sunset',    birthData.sunset],
      ['Ayanamsha', birthData.ayanamsha ? parseFloat(birthData.ayanamsha).toFixed(4) : null]
    );
  }

  fields.forEach(([label, value]) => {
    if (value === null || value === undefined || value === '') return;
    const div = document.createElement('div');
    div.innerHTML = `
      <p class="font-label text-xs uppercase tracking-wider text-secondary mb-1">${label}</p>
      <p class="font-body text-sm text-on-surface">${value}</p>`;
    content.appendChild(div);
  });
}

// ============================================================
// Planet Interpretations
// ============================================================
function renderInterpretations(planets) {
  const container = document.getElementById('interpretations');
  container.innerHTML = '';
  ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'].forEach(pName => {
    const planet = planets.find(p => p.name === pName);
    if (!planet) return;
    const meta = PLANET_META[pName];
    if (!meta) return;
    const sign = planet.sign || '-';
    const div = document.createElement('div');
    div.className = 'bg-surface-container-high rounded-xl p-6 border border-outline-variant/20';
    div.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <span class="material-symbols-outlined ${meta.color}">${meta.icon}</span>
        <h4 class="font-label text-xs uppercase tracking-wider text-secondary">${meta.label}</h4>
      </div>
      <p class="font-headline text-xl text-on-surface mb-1">${SIGN_SYMBOLS_MAP[sign] || ''} ${sign}</p>
      <p class="font-body text-xs text-on-surface-variant mb-2">House ${planet.house || '-'} · ${planet.nakshatra || ''} · ${planet.planet_awastha || ''}</p>
      <p class="font-body text-sm text-on-surface-variant leading-relaxed">${meta.desc}${SIGN_KEYWORDS[sign] ? ' In ' + sign + ': ' + SIGN_KEYWORDS[sign] + '.' : ''}</p>`;
    container.appendChild(div);
  });
}

// ============================================================
// PDF — browser print dialog
// ============================================================
function downloadPDF() {
  if (!currentChartData) return;
  const { name, dob, tob, place, planetsData, astroData, birthData } = currentChartData;
  const dobFormatted = new Date(dob + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  let planetRows = planetsData
    .filter(p => p.name !== 'Ascendant')
    .map(p => {
      const isRetro = p.isRetro === 'true' || p.isRetro === true;
      return `<tr>
        <td>${p.name}</td>
        <td>${p.sign || '-'}</td>
        <td>${p.normDegree ? p.normDegree.toFixed(2) + '°' : '-'}</td>
        <td>${p.house || '-'}</td>
        <td>${p.nakshatra || '-'}</td>
        <td>${p.planet_awastha || '-'}</td>
        <td>${isRetro ? 'Retrograde' : 'Direct'}</td>
      </tr>`;
    }).join('');

  let astroRows = '';
  if (astroData) {
    const fields = [
      ['Ascendant', astroData.ascendant], ['Rashi', astroData.sign],
      ['Nakshatra', astroData.Naksahtra], ['Nakshatra Lord', astroData.NaksahtraLord],
      ['Charan', astroData.Charan], ['Tithi', astroData.Tithi],
      ['Yoga', astroData.Yog], ['Karan', astroData.Karan],
      ['Varna', astroData.Varna], ['Vashya', astroData.Vashya],
      ['Yoni', astroData.Yoni], ['Gan', astroData.Gan],
      ['Nadi', astroData.Nadi], ['Tatva', astroData.tatva],
      ['Name Alphabet', astroData.name_alphabet], ['Paya', astroData.paya],
    ];
    if (birthData) {
      fields.push(['Sunrise', birthData.sunrise], ['Sunset', birthData.sunset]);
    }
    astroRows = fields.filter(([,v]) => v).map(([l,v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('');
  }

  const html = `<!DOCTYPE html><html><head><title>Birth Chart — ${name}</title>
  <style>
    body{font-family:Georgia,serif;color:#222;padding:40px;max-width:900px;margin:0 auto}
    h1{color:#775a19;font-size:26px;margin-bottom:4px}
    h2{color:#775a19;font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}
    .meta{color:#666;font-size:13px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
    th{background:#f5f0e8;text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#775a19}
    td{padding:7px 10px;border-bottom:1px solid #eee}
    .footer{margin-top:36px;text-align:center;color:#999;font-size:11px;font-style:italic}
    @media print{body{padding:20px}}
  </style></head><body>
  <h1>✦ Celestial Elite — Birth Chart Report</h1>
  <div class="meta">
    <strong>Name:</strong> ${name} &nbsp;|&nbsp;
    <strong>Date:</strong> ${dobFormatted} &nbsp;|&nbsp;
    <strong>Time:</strong> ${tob} &nbsp;|&nbsp;
    <strong>Place:</strong> ${place.split(',')[0]}
  </div>
  <h2>Planetary Positions</h2>
  <table>
    <thead><tr><th>Planet</th><th>Sign</th><th>Degree</th><th>House</th><th>Nakshatra</th><th>Awastha</th><th>Status</th></tr></thead>
    <tbody>${planetRows}</tbody>
  </table>
  ${astroRows ? `<h2>Astrological Details</h2><table><tbody>${astroRows}</tbody></table>` : ''}
  <div class="footer">Generated by Celestial Elite · © 2024 · Bound by the Stars</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function resetForm() {
  document.getElementById('results').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Helpers
// ============================================================
function setLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
  const formSection = document.getElementById('birth-chart-form').closest('section');
  formSection.classList.toggle('opacity-50', show);
  formSection.classList.toggle('pointer-events-none', show);
}

function showError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() {
  document.getElementById('form-error').classList.add('hidden');
}

function getSignNumber(signName) {
  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                 'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const idx = signs.indexOf(signName);
  return idx >= 0 ? idx + 1 : 1;
}

// ============================================================
// GEMINI CHATBOT — appears after chart is generated
// Pre-loaded with full chart data as system context
// ============================================================

let chatMessages = [];   // conversation history
let chatContext  = '';   // system prompt built from chart data

// Called from renderResults() after chart loads
function initChatbot(chartData) {
  const { name, dob, tob, place, planetsData, astroData, birthData } = chartData;

  // Build rich system prompt from all API data
  const planetLines = planetsData
    .map(p => `  - ${p.name}: ${p.sign}, House ${p.house}, Nakshatra ${p.nakshatra}, ${p.isRetro === 'true' || p.isRetro === true ? 'Retrograde' : 'Direct'}, Awastha: ${p.planet_awastha}`)
    .join('\n');

  chatContext = `You are Jyotish — a wise, warm Vedic astrology guide for Celestial Elite.
You have the complete birth chart of ${name}. Use ONLY this data to answer questions.
Be personal, specific, and insightful. Keep responses to 4-6 sentences max — always write COMPLETE sentences, never cut off mid-answer.
Never say "I don't have enough information" — you have everything below.

=== BIRTH DETAILS ===
Name: ${name}
Date of Birth: ${dob}
Time of Birth: ${tob}
Place of Birth: ${place}
Sunrise: ${birthData?.sunrise || 'N/A'} | Sunset: ${birthData?.sunset || 'N/A'}
Ayanamsha: ${birthData?.ayanamsha ? parseFloat(birthData.ayanamsha).toFixed(4) : 'N/A'}

=== PLANETARY POSITIONS ===
${planetLines}

=== ASTROLOGICAL DETAILS ===
Ascendant: ${astroData?.ascendant || 'N/A'}
Rashi (Moon Sign): ${astroData?.sign || 'N/A'}
Nakshatra: ${astroData?.Naksahtra || 'N/A'} (Lord: ${astroData?.NaksahtraLord || 'N/A'}, Pada: ${astroData?.Charan || 'N/A'})
Tithi: ${astroData?.Tithi || 'N/A'}
Yoga: ${astroData?.Yog || 'N/A'}
Karan: ${astroData?.Karan || 'N/A'}
Varna: ${astroData?.Varna || 'N/A'}
Vashya: ${astroData?.Vashya || 'N/A'}
Yoni: ${astroData?.Yoni || 'N/A'}
Gan: ${astroData?.Gan || 'N/A'}
Nadi: ${astroData?.Nadi || 'N/A'}
Tatva: ${astroData?.tatva || 'N/A'}
Name Alphabet: ${astroData?.name_alphabet || 'N/A'}
Paya: ${astroData?.paya || 'N/A'}
Sign Lord: ${astroData?.SignLord || 'N/A'}

Answer all questions about ${name}'s life, personality, career, relationships, health, and destiny based on this chart.`;

  // Reset conversation
  chatMessages = [];
  document.getElementById('chat-messages').innerHTML = '';

  // Show chatbot section
  document.getElementById('chatbot-section').classList.remove('hidden');

  // Add welcome message
  appendBotMessage(`Namaste! I've studied ${name}'s complete birth chart. ✨ Ask me anything — about personality, career, relationships, health, or what the stars hold for the future.`);

  // Scroll to chatbot
  setTimeout(() => {
    document.getElementById('chatbot-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;
  document.getElementById('chat-send-btn').disabled = true;

  // Show user message
  appendUserMessage(text);

  // Add to history
  chatMessages.push({ role: 'user', parts: [{ text }] });

  // Show typing indicator
  const typingId = appendTyping();

  try {
    const res  = await fetch('/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: chatMessages, systemPrompt: chatContext })
    });
    const data = await res.json();

    removeTyping(typingId);

    if (data.error) throw new Error(data.message);

    const reply = data.text;
    chatMessages.push({ role: 'model', parts: [{ text: reply }] });
    appendBotMessage(reply);

  } catch (err) {
    removeTyping(typingId);
    const msg = err.message.includes('rate-limited') || err.message.includes('quota') || err.message.includes('429')
      ? '⏳ The AI is a bit busy right now (rate limit). Please wait 30–60 seconds and try again.'
      : 'Sorry, I encountered an error. Please try again. ' + err.message;
    appendBotMessage(msg);
  }

  input.disabled = false;
  document.getElementById('chat-send-btn').disabled = false;
  input.focus();
}

function appendUserMessage(text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'flex justify-end mb-4';
  div.innerHTML = `
    <div class="max-w-[80%] bg-primary/20 border border-primary/30 text-on-surface rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-body leading-relaxed">
      ${escapeHtml(text)}
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendBotMessage(text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'flex gap-3 mb-4';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
      <span class="text-primary text-xs">✦</span>
    </div>
    <div class="max-w-[80%] bg-surface-container-high border border-outline-variant/20 text-on-surface-variant rounded-2xl rounded-tl-sm px-4 py-3 text-sm font-body leading-relaxed">
      ${text.replace(/\n/g, '<br>')}
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendTyping() {
  const container = document.getElementById('chat-messages');
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id        = id;
  div.className = 'flex gap-3 mb-4';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <span class="text-primary text-xs">✦</span>
    </div>
    <div class="bg-surface-container-high border border-outline-variant/20 rounded-2xl rounded-tl-sm px-4 py-3">
      <div class="flex gap-1 items-center h-5">
        <span class="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style="animation-delay:0ms"></span>
        <span class="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style="animation-delay:150ms"></span>
        <span class="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style="animation-delay:300ms"></span>
      </div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
