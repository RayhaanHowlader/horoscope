// ============================================================
// kundli-match.js
// API: /match_making_detailed_report + /match_astro_details
// Payload: { m_day, m_month, m_year, m_hour, m_min, m_lat, m_lon, m_tzone,
//            f_day, f_month, f_year, f_hour, f_min, f_lat, f_lon, f_tzone }
// ============================================================

const ASHTAKOOTA_KOOTS = [
  { key:'varna',  name:'Varna',        significance:'Natural refinement & spiritual compatibility' },
  { key:'vashya', name:'Vashya',       significance:'Innate attraction & mutual giving' },
  { key:'tara',   name:'Tara',         significance:'Comfort, prosperity & health' },
  { key:'yoni',   name:'Yoni',         significance:'Intimate physical compatibility' },
  { key:'maitri', name:'Graha Maitri', significance:'Mental compatibility & friendship' },
  { key:'gan',    name:'Gan',          significance:'Temperament & nature match' },
  { key:'bhakut', name:'Bhakut',       significance:'Constructive ability & prosperity' },
  { key:'nadi',   name:'Nadi',         significance:'Progeny & genetic compatibility' },
];

const DOSHA_REMEDIES = {
  manglik: ['Perform Mangal Shanti Puja before marriage.','Wear a red coral (Moonga) gemstone after consulting an astrologer.','Kumbh Vivah (symbolic marriage to a banana tree) can neutralize the dosha.','Chant Hanuman Chalisa daily for 40 days.'],
  rajju:   ['Perform Rajju Dosha Shanti Puja with proper Vedic rituals.','Both partners should observe fast on Saturdays.','Donate black sesame seeds and iron items on Saturdays.','Consult a Vedic astrologer for personalized remedies.'],
  vedha:   ['Perform Vedha Dosha Nivaran Puja.','Both partners should recite Mahamrityunjaya Mantra 108 times daily.','Donate white items (rice, milk, white cloth) on Mondays.','Wear pearl (Moti) gemstone after astrological consultation.'],
};

let currentMatchData = null;

document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('m-place','m-place-suggestions','m-lat','m-lon','m-tz');
  setupAutocomplete('f-place','f-place-suggestions','f-lat','f-lon','f-tz');
});

async function matchKundli() {
  const mName = document.getElementById('m-name').value.trim();
  const mDob  = document.getElementById('m-dob').value;
  const mTob  = document.getElementById('m-tob').value;
  const mLat  = document.getElementById('m-lat').value;
  const mLon  = document.getElementById('m-lon').value;
  const mTz   = document.getElementById('m-tz').value;
  const fName = document.getElementById('f-name').value.trim();
  const fDob  = document.getElementById('f-dob').value;
  const fTob  = document.getElementById('f-tob').value;
  const fLat  = document.getElementById('f-lat').value;
  const fLon  = document.getElementById('f-lon').value;
  const fTz   = document.getElementById('f-tz').value;

  clearMatchError();
  if (!mName || !mDob || !mTob || !mLat) return showMatchError("Please complete all Boy's details and select a place from suggestions.");
  if (!fName || !fDob || !fTob || !fLat) return showMatchError("Please complete all Girl's details and select a place from suggestions.");

  setMatchLoading(true);

  try {
    const matchPayload = buildMatchPayload(
      mDob, mTob, mLat, mLon, mTz || '5.5',
      fDob, fTob, fLat, fLon, fTz || '5.5'
    );

    const [detailedReport, astroDetails] = await Promise.all([
      callAstroAPI('match_making_detailed_report', matchPayload),
      callAstroAPI('match_astro_details', matchPayload)
    ]);

    currentMatchData = { mName, fName, detailedReport, astroDetails };
    renderMatchResults(currentMatchData);
  } catch (err) {
    showMatchError('API call failed. Check your credentials in js/config.js. ' + err.message);
    setMatchLoading(false);
  }
}

function renderMatchResults({ mName, fName, detailedReport, astroDetails }) {
  setMatchLoading(false);
  document.getElementById('results').classList.remove('hidden');

  const total    = detailedReport.ashtakoota?.total || {};
  const score    = total.received_points ?? 0;
  const maxScore = total.total_points ?? 36;
  const pct      = Math.round((score / maxScore) * 100);

  document.getElementById('match-boy-name').textContent  = mName;
  document.getElementById('match-girl-name').textContent = fName;
  document.getElementById('score-value').textContent     = score;

  // Use API conclusion report if available
  const conclusion = detailedReport.ashtakoota?.conclusion;
  document.getElementById('score-message').textContent =
    conclusion?.report || getScoreMessage(score);

  setTimeout(() => {
    const fill = document.getElementById('score-bar-fill');
    fill.style.width = pct + '%';
    if (score >= 28)      fill.className = 'score-fill bg-gradient-to-r from-green-500 to-green-400';
    else if (score >= 18) fill.className = 'score-fill bg-gradient-to-r from-primary to-primary-container';
    else                  fill.className = 'score-fill bg-gradient-to-r from-red-600 to-red-400';
  }, 100);

  renderGunaTable(detailedReport.ashtakoota);
  renderDoshaAnalysis(detailedReport);
  renderAstroComparison(astroDetails);
  renderRemedies(detailedReport);
  renderFinalConclusion(detailedReport);

  document.getElementById('results').scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderGunaTable(ashtakoota) {
  const tbody = document.getElementById('guna-table-body');
  tbody.innerHTML = '';
  if (!ashtakoota) return;

  ASHTAKOOTA_KOOTS.forEach(koot => {
    const data = ashtakoota[koot.key];
    if (!data) return;
    const obtained = data.received_points ?? 0;
    const max      = data.total_points ?? 0;
    const pct      = max > 0 ? (obtained / max) * 100 : 0;
    const color    = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-container-high/50 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-4 font-label text-on-surface">${koot.name}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${data.description || koot.significance}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${data.male_koot_attribute || '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant text-xs">${data.female_koot_attribute || '-'}</td>
      <td class="py-3 px-4 text-on-surface-variant">${max}</td>
      <td class="py-3 px-4 font-semibold ${color}">${obtained}</td>`;
    tbody.appendChild(tr);
  });

  const total = ashtakoota.total;
  if (total) {
    const tr = document.createElement('tr');
    tr.className = 'border-t-2 border-outline-variant/30 font-semibold bg-surface-container/50';
    tr.innerHTML = `
      <td class="py-3 px-4 text-primary font-label" colspan="4">Total Score (Min. required: ${total.minimum_required})</td>
      <td class="py-3 px-4 text-on-surface">${total.total_points}</td>
      <td class="py-3 px-4 text-primary text-lg">${total.received_points}</td>`;
    tbody.appendChild(tr);
  }
}

function renderDoshaAnalysis(report) {
  const grid = document.getElementById('dosha-grid');
  grid.innerHTML = '';

  const doshas = [
    {
      key:'manglik', label:'Manglik Dosha', icon:'local_fire_department',
      status: report.manglik?.status,
      extra: report.manglik ? `Boy: ${report.manglik.male_percentage}% · Girl: ${report.manglik.female_percentage}%` : '',
      desc: 'Mars in 1st, 4th, 7th, 8th, or 12th house. Affects marriage harmony and longevity.',
    },
    {
      key:'rajju', label:'Rajju Dosha', icon:'link',
      status: report.rajju_dosha?.status,
      extra: '',
      desc: 'Nakshatra-based dosha that can threaten the strength and longevity of married life.',
    },
    {
      key:'vedha', label:'Vedha Dosha', icon:'block',
      status: report.vedha_dosha?.status,
      extra: '',
      desc: 'Obstruction dosha based on nakshatra positions. Can create obstacles in married life.',
    },
  ];

  doshas.forEach(dosha => {
    const isPresent  = dosha.status === true;
    const badgeClass = isPresent ? 'dosha-badge-yes' : 'dosha-badge-no';
    const badgeText  = isPresent ? '⚠ Present' : '✓ Not Present';
    const div = document.createElement('div');
    div.className = 'bg-surface-container rounded-xl p-6 border border-outline-variant/20';
    div.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <span class="material-symbols-outlined ${isPresent ? 'text-red-400' : 'text-green-400'}">${dosha.icon}</span>
        <h4 class="font-label text-sm text-on-surface">${dosha.label}</h4>
      </div>
      <span class="inline-block px-3 py-1 rounded-full text-xs font-label ${badgeClass} mb-3">${badgeText}</span>
      <p class="font-body text-xs text-on-surface-variant leading-relaxed">${dosha.desc}</p>
      ${dosha.extra ? `<p class="font-body text-xs text-secondary mt-2">${dosha.extra}</p>` : ''}`;
    grid.appendChild(div);
  });
}

function renderAstroComparison(astroDetails) {
  const tbody = document.getElementById('astro-compare-body');
  tbody.innerHTML = '';
  if (!astroDetails) return;

  const m = astroDetails.male_astro_details   || {};
  const f = astroDetails.female_astro_details || {};

  // Exact field names from match_astro_details API response
  const fields = [
    ['Ascendant',      'ascendant'],
    ['Rashi (Sign)',   'sign'],
    ['Nakshatra',      'Naksahtra'],
    ['Nakshatra Lord', 'NaksahtraLord'],
    ['Charan (Pada)',  'Charan'],
    ['Tithi',          'Tithi'],
    ['Yoga',           'Yog'],
    ['Karan',          'Karan'],
    ['Varna',          'Varna'],
    ['Vashya',         'Vashya'],
    ['Yoni',           'Yoni'],
    ['Gan',            'Gan'],
    ['Nadi',           'Nadi'],
    ['Tatva',          'tatva'],
    ['Name Alphabet',  'name_alphabet'],
    ['Paya',           'paya'],
    ['Sign Lord',      'SignLord'],
    ['Yunja',          'yunja'],
  ];

  fields.forEach(([label, key]) => {
    const mVal = m[key] ?? '-';
    const fVal = f[key] ?? '-';
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-surface-container-high/50 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-4 font-label text-xs uppercase tracking-wider text-secondary">${label}</td>
      <td class="py-3 px-4 text-primary text-sm">${mVal}</td>
      <td class="py-3 px-4 text-tertiary text-sm">${fVal}</td>`;
    tbody.appendChild(tr);
  });
}

function renderRemedies(report) {
  const section = document.getElementById('remedies-section');
  const content = document.getElementById('remedies-content');
  content.innerHTML = '';

  const active = [];
  if (report.manglik?.status)     active.push({ title:'Manglik Dosha Remedies', items: DOSHA_REMEDIES.manglik });
  if (report.rajju_dosha?.status) active.push({ title:'Rajju Dosha Remedies',   items: DOSHA_REMEDIES.rajju });
  if (report.vedha_dosha?.status) active.push({ title:'Vedha Dosha Remedies',   items: DOSHA_REMEDIES.vedha });

  if (!active.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  active.forEach(remedy => {
    const div = document.createElement('div');
    div.className = 'bg-surface-container rounded-xl p-6 border border-outline-variant/20';
    div.innerHTML = `
      <h4 class="font-label text-sm uppercase tracking-wider text-primary mb-4">${remedy.title}</h4>
      <ul class="space-y-2">
        ${remedy.items.map(item => `
          <li class="flex items-start gap-3 text-sm text-on-surface-variant">
            <span class="material-symbols-outlined text-primary text-sm mt-0.5">star</span>${item}
          </li>`).join('')}
      </ul>`;
    content.appendChild(div);
  });
}

function renderFinalConclusion(report) {
  const el = document.getElementById('final-conclusion');
  if (!el) return;
  const text = report.conclusion?.match_report;
  if (!text) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  document.getElementById('final-conclusion-text').textContent = text;
}

// ============================================================
// PDF Download
// ============================================================
function downloadMatchPDF() {
  if (!currentMatchData) return;
  const { mName, fName, detailedReport, astroDetails } = currentMatchData;
  const score = detailedReport.ashtakoota?.total?.received_points ?? 0;
  const m = astroDetails?.male_astro_details   || {};
  const f = astroDetails?.female_astro_details || {};

  const fields = ['ascendant','sign','Naksahtra','NaksahtraLord','Charan','Tithi','Yog','Karan','Varna','Vashya','Yoni','Gan','Nadi','tatva','name_alphabet','paya'];
  const labels = ['Ascendant','Rashi','Nakshatra','Nakshatra Lord','Charan','Tithi','Yoga','Karan','Varna','Vashya','Yoni','Gan','Nadi','Tatva','Name Alphabet','Paya'];

  const astroRows = fields.map((k, i) =>
    `<tr><td>${labels[i]}</td><td>${m[k] ?? '-'}</td><td>${f[k] ?? '-'}</td></tr>`
  ).join('');

  let kootRows = '';
  ASHTAKOOTA_KOOTS.forEach(koot => {
    const data = detailedReport.ashtakoota?.[koot.key];
    if (!data) return;
    kootRows += `<tr><td>${koot.name}</td><td>${data.male_koot_attribute || '-'}</td><td>${data.female_koot_attribute || '-'}</td><td>${data.total_points}</td><td>${data.received_points}</td></tr>`;
  });

  const html = `<!DOCTYPE html><html><head><title>Kundli Match — ${mName} & ${fName}</title>
  <style>
    body{font-family:Georgia,serif;color:#222;padding:40px;max-width:900px;margin:0 auto}
    h1{color:#775a19;font-size:26px;margin-bottom:4px}
    h2{color:#775a19;font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}
    .score{font-size:52px;color:#775a19;font-weight:bold;text-align:center;margin:16px 0}
    .meta{color:#666;font-size:13px;margin-bottom:20px;text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
    th{background:#f5f0e8;text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#775a19}
    td{padding:7px 10px;border-bottom:1px solid #eee}
    .footer{margin-top:36px;text-align:center;color:#999;font-size:11px;font-style:italic}
    @media print{body{padding:20px}}
  </style></head><body>
  <h1>✦ Celestial Elite — Kundli Compatibility Report</h1>
  <div class="meta">${mName} ♥ ${fName}</div>
  <div class="score">${score} / 36</div>
  <div class="meta">${detailedReport.ashtakoota?.conclusion?.report || getScoreMessage(score)}</div>
  <h2>Guna Milan (Ashtakoota)</h2>
  <table><thead><tr><th>Koot</th><th>Boy</th><th>Girl</th><th>Max</th><th>Score</th></tr></thead><tbody>${kootRows}</tbody></table>
  <h2>Astrological Comparison</h2>
  <table><thead><tr><th>Parameter</th><th>${mName} (Boy)</th><th>${fName} (Girl)</th></tr></thead><tbody>${astroRows}</tbody></table>
  ${detailedReport.conclusion?.match_report ? `<h2>Final Conclusion</h2><p style="font-size:14px;line-height:1.6">${detailedReport.conclusion.match_report}</p>` : ''}
  <div class="footer">Generated by Celestial Elite · © 2024 · Bound by the Stars</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

function resetMatchForm() {
  document.getElementById('results').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setMatchLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

function showMatchError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearMatchError() {
  document.getElementById('form-error').classList.add('hidden');
}

function getScoreMessage(score) {
  if (score >= 32) return 'Exceptional match — a truly cosmic union. ✦';
  if (score >= 28) return 'Excellent compatibility — highly auspicious for marriage.';
  if (score >= 24) return 'Good match — a harmonious and balanced partnership.';
  if (score >= 18) return 'Average compatibility — requires mutual understanding and effort.';
  if (score >= 12) return 'Below average — significant differences need to be addressed.';
  return 'Challenging match — consult an astrologer for detailed guidance.';
}
