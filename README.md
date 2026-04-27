# Celestial Elite — Astrology Website

## Setup & Running

**Step 1** — Add your credentials to `.env`:
```
ASTRO_USER_ID=638271
ASTRO_API_KEY=your_api_key_here
ASTRO_ACCESS_TOKEN=your_access_token_here
```
Get these from: https://astrologyapi.com/dashboard/app/credentials

**Step 2** — Start the server:
```bash
node server.js
```

**Step 3** — Open in browser:
```
http://localhost:3000
```

> Why a server? Browsers block direct API calls to external domains (CORS). The proxy server forwards your requests server-side where credentials are safe in `.env`.

---

## Credentials (from `.env`)

## Credentials (from `.env`)

```env
ASTRO_USER_ID=YOUR_USER_ID
ASTRO_API_KEY=YOUR_API_KEY
ASTRO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
```

---

## Authentication Methods

| Method | Header | Used For |
|--------|--------|----------|
| Basic Auth | `Authorization: Basic base64(userId:apiKey)` | All standard endpoints |
| Access Token | `x-astrologyapi-key: <token>` | Wallet/Chat APIs |

---

## API Endpoints & Exact Parameters

### Birth Chart (`birth-chart.html`)
| Endpoint | Method | Payload |
|----------|--------|---------|
| `/planets` | POST | `{ day, month, year, hour, min, lat, lon, tzone }` |
| `/astro_details` | POST | `{ day, month, year, hour, min, lat, lon, tzone }` |
| `/birth_details` | POST | `{ day, month, year, hour, min, lat, lon, tzone }` |

**planets response:** `id, name, fullDegree, normDegree, speed, isRetro, sign, signLord, nakshatra, nakshatraLord, nakshatra_pad, house, is_planet_set, planet_awastha`

**astro_details response:** `ascendant, Varna, Vashya, Yoni, Gan, Nadi, SignLord, sign, Naksahtra, NaksahtraLord, Charan, Yog, Karan, Tithi, yunja, tatva, name_alphabet, paya`

### Kundli Matching (`kundli-match.html`)
| Endpoint | Method | Payload |
|----------|--------|---------|
| `/match_making_detailed_report` | POST | `{ m_day, m_month, m_year, m_hour, m_min, m_lat, m_lon, m_tzone, f_day, f_month, f_year, f_hour, f_min, f_lat, f_lon, f_tzone }` |
| `/match_astro_details` | POST | same as above |

**match_making_detailed_report response:** `ashtakoota.{varna,vashya,tara,yoni,maitri,gan,bhakut,nadi}.{description, male_koot_attribute, female_koot_attribute, total_points, received_points}` + `manglik.{status, male_percentage, female_percentage}` + `rajju_dosha.{status}` + `vedha_dosha.{status}` + `conclusion.{match_report}`

**match_astro_details response:** `male_astro_details / female_astro_details` with fields: `ascendant, Varna, Vashya, Yoni, Gan, Nadi, SignLord, sign, Naksahtra, NaksahtraLord, Charan, Yog, Karan, Tithi, yunja, tatva, name_alphabet, paya`

### Daily Horoscope (`horoscope.html`)
| Endpoint | Day | Method | Body |
|----------|-----|--------|------|
| `/sun_sign_prediction/daily/:sign` | Today | POST | `{ tzone: 5.5 }` |
| `/sun_sign_prediction/daily/next/:sign` | Tomorrow | POST | `{ tzone: 5.5 }` |
| `/sun_sign_prediction/daily/previous/:sign` | Yesterday | POST | `{ tzone: 5.5 }` |

**Response:** `status, sun_sign, prediction_date, prediction.{ personal_life, profession, health, travel, luck, emotions }`
