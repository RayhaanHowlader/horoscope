// ============================================================
// horoscope.js
//
// API endpoint: POST /sun_sign_prediction/daily/:zodiacName
//               POST /sun_sign_prediction/daily/next/:zodiacName     (tomorrow)
//               POST /sun_sign_prediction/daily/previous/:zodiacName (yesterday)
// Auth: Basic Auth (User ID + API Key)
// Request body: { tzone: 5.5 }
//
// Response fields (per API docs):
//   status, sun_sign, prediction_date,
//   prediction: {
//     personal_life, profession, health, travel, luck, emotions
//   }
// ============================================================

const ZODIAC_SIGNS = [
  { name:'aries',       label:'Aries',       symbol:'♈', dates:'Mar 21 - Apr 19', icon:'local_fire_department', color:'text-red-400' },
  { name:'taurus',      label:'Taurus',       symbol:'♉', dates:'Apr 20 - May 20', icon:'landscape',             color:'text-green-400' },
  { name:'gemini',      label:'Gemini',       symbol:'♊', dates:'May 21 - Jun 20', icon:'air',                   color:'text-yellow-300' },
  { name:'cancer',      label:'Cancer',       symbol:'♋', dates:'Jun 21 - Jul 22', icon:'water_drop',            color:'text-blue-300' },
  { name:'leo',         label:'Leo',          symbol:'♌', dates:'Jul 23 - Aug 22', icon:'sunny',                 color:'text-yellow-400' },
  { name:'virgo',       label:'Virgo',        symbol:'♍', dates:'Aug 23 - Sep 22', icon:'eco',                   color:'text-green-300' },
  { name:'libra',       label:'Libra',        symbol:'♎', dates:'Sep 23 - Oct 22', icon:'balance',               color:'text-pink-300' },
  { name:'scorpio',     label:'Scorpio',      symbol:'♏', dates:'Oct 23 - Nov 21', icon:'pest_control',          color:'text-red-500' },
  { name:'sagittarius', label:'Sagittarius',  symbol:'♐', dates:'Nov 22 - Dec 21', icon:'arrow_upward',          color:'text-orange-400' },
  { name:'capricorn',   label:'Capricorn',    symbol:'♑', dates:'Dec 22 - Jan 19', icon:'terrain',               color:'text-slate-400' },
  { name:'aquarius',    label:'Aquarius',     symbol:'♒', dates:'Jan 20 - Feb 18', icon:'waves',                 color:'text-blue-400' },
  { name:'pisces',      label:'Pisces',       symbol:'♓', dates:'Feb 19 - Mar 20', icon:'water',                 color:'text-indigo-400' },
];

// Day → endpoint path segment
const DAY_ENDPOINT = {
  yesterday: 'daily/previous',
  today:     'daily',
  tomorrow:  'daily/next'
};

let currentDay  = 'today';
let currentSign = null;

document.addEventListener('DOMContentLoaded', () => {
  renderSignButtons();
  const params    = new URLSearchParams(window.location.search);
  const signParam = params.get('sign');
  if (signParam) {
    const found = ZODIAC_SIGNS.find(s => s.name === signParam.toLowerCase());
    if (found) { selectSign(found.name); return; }
  }
  loadAllSignsGrid();
});

function renderSignButtons() {
  const container = document.querySelector('.grid.grid-cols-3');
  if (!container) return;
  container.innerHTML = '';
  ZODIAC_SIGNS.forEach(sign => {
    const btn = document.createElement('button');
    btn.id        = `sign-btn-${sign.name}`;
    btn.className = 'sign-btn flex flex-col items-center gap-1 p-3 rounded-xl border border-outline-variant/20 hover:border-primary/40 transition-all duration-300 cursor-pointer';
    btn.onclick   = () => selectSign(sign.name);
    btn.innerHTML = `
      <span class="text-2xl">${sign.symbol}</span>
      <span class="font-label text-xs text-on-surface-variant">${sign.label}</span>`;
    container.appendChild(btn);
  });
}

function setDay(day) {
  currentDay = day;
  ['yesterday','today','tomorrow'].forEach(d => {
    document.getElementById(`btn-${d}`).classList.toggle('active', d === day);
  });
  if (currentSign) selectSign(currentSign);
}

async function selectSign(signName) {
  currentSign = signName;

  ZODIAC_SIGNS.forEach(s => {
    const btn = document.getElementById(`sign-btn-${s.name}`);
    if (btn) btn.classList.toggle('active', s.name === signName);
  });

  const signInfo = ZODIAC_SIGNS.find(s => s.name === signName);
  if (!signInfo) return;

  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('horoscope-display').classList.add('hidden');
  document.getElementById('all-signs-grid').classList.add('hidden');

  try {
    // Endpoint: sun_sign_prediction/daily/:zodiacName
    //           sun_sign_prediction/daily/next/:zodiacName
    //           sun_sign_prediction/daily/previous/:zodiacName
    const dayPath = DAY_ENDPOINT[currentDay] || 'daily';
    const endpoint = `sun_sign_prediction/${dayPath}/${signName}`;

    // Body: { tzone } — use IST as default
    const data = await callAstroAPI(endpoint, { tzone: 5.5 });
    renderHoroscope(signInfo, data);
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('horoscope-display').classList.remove('hidden');
    document.getElementById('horoscope-display').innerHTML = `
      <div class="text-center py-16 max-w-lg mx-auto">
        <span class="material-symbols-outlined text-4xl text-outline mb-4 block">error_outline</span>
        <p class="text-on-surface-variant mb-2">Could not load horoscope.</p>
        <p class="text-xs text-outline">Check your API credentials in js/config.js</p>
        <p class="text-xs text-outline mt-1">${err.message}</p>
      </div>`;
  }
}

// ============================================================
// Render horoscope — uses exact API response fields:
// status, sun_sign, prediction_date,
// prediction.personal_life, prediction.profession,
// prediction.health, prediction.travel,
// prediction.luck, prediction.emotions
// ============================================================
function renderHoroscope(signInfo, data) {
  document.getElementById('loading').classList.add('hidden');
  const display = document.getElementById('horoscope-display');
  display.classList.remove('hidden');

  document.getElementById('sign-symbol').textContent = signInfo.symbol;
  document.getElementById('sign-name').textContent   = signInfo.label;
  document.getElementById('sign-dates').textContent  = signInfo.dates;

  // prediction_date from API
  if (data.prediction_date) {
    document.getElementById('prediction-date').textContent = 'Prediction for: ' + data.prediction_date;
    document.getElementById('prediction-date').classList.remove('hidden');
  }

  const pred = data.prediction || {};

  // Map API fields to display elements
  document.getElementById('personal-life-prediction').textContent = pred.personal_life || '—';
  document.getElementById('profession-prediction').textContent    = pred.profession    || '—';
  document.getElementById('health-prediction').textContent        = pred.health        || '—';
  document.getElementById('travel-prediction').textContent        = pred.travel        || '—';
  document.getElementById('luck-prediction').textContent          = pred.luck          || '—';
  document.getElementById('emotions-prediction').textContent      = pred.emotions      || '—';
}

async function loadAllSignsGrid() {
  const grid = document.getElementById('all-signs-grid');
  grid.classList.remove('hidden');
  grid.innerHTML = '';

  ZODIAC_SIGNS.forEach(sign => {
    const card = document.createElement('div');
    card.id        = `preview-${sign.name}`;
    card.className = 'bg-surface-container-high rounded-xl p-6 border border-outline-variant/20 cursor-pointer hover:border-primary/30 transition-all duration-300 group';
    card.onclick   = () => selectSign(sign.name);
    card.innerHTML = `
      <div class="flex items-center gap-4 mb-4">
        <span class="text-4xl">${sign.symbol}</span>
        <div>
          <h3 class="font-headline text-lg text-primary">${sign.label}</h3>
          <p class="font-label text-xs text-on-surface-variant uppercase tracking-wider">${sign.dates}</p>
        </div>
      </div>
      <div id="preview-text-${sign.name}" class="space-y-2">
        <div class="h-3 bg-surface-bright/30 rounded animate-pulse w-full"></div>
        <div class="h-3 bg-surface-bright/30 rounded animate-pulse w-3/4"></div>
      </div>
      <div class="mt-4 flex items-center gap-2 text-primary text-xs font-label opacity-0 group-hover:opacity-100 transition-opacity">
        Read full horoscope <span class="material-symbols-outlined text-xs">arrow_forward</span>
      </div>`;
    grid.appendChild(card);
  });

  // Load first 4 signs as preview (saves API calls)
  for (const sign of ZODIAC_SIGNS.slice(0, 4)) {
    try {
      const data = await callAstroAPI(`sun_sign_prediction/daily/${sign.name}`, { tzone: 5.5 });
      const text = data.prediction?.personal_life || '';
      const el   = document.getElementById(`preview-text-${sign.name}`);
      if (el && text) {
        el.innerHTML = `<p class="font-body text-on-surface-variant text-sm leading-relaxed">${text.substring(0, 110)}...</p>`;
      }
    } catch { /* silent */ }
  }
}
