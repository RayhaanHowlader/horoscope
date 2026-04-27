// ============================================================
// kundli-chart.js
//
// NORTH INDIAN — verified layout (kundligpt.com):
//
//  A square with an inner diamond. 12 sections total:
//  4 diamond (rhombus) sections at center of each side = H1,H4,H7,H10
//  8 triangular corner sections = H2,H3,H5,H6,H8,H9,H11,H12
//
//  Houses numbered COUNTER-CLOCKWISE from top:
//
//        ┌──────────────────────┐
//        │╲   H12   │   H11   ╱│
//        │  ╲       │       ╱  │
//        │H1  ╲─────┼─────╱  H10│  ← H1=top diamond, H10=right diamond
//        │  ╱  ╲    │    ╱  ╲  │
//        │╱  H2  ╲──┼──╱  H9  ╲│
//        ├─────────╲│╱─────────┤
//        │╲  H3   ╱│╲   H8   ╱│
//        │  ╲   ╱  │  ╲   ╱  │
//        │H4  ╲────┼────╱  H7  │  ← H4=left diamond, H7=bottom diamond
//        │  ╱  ╲   │   ╱  ╲  │
//        │╱  H5  ╲─┼─╱  H8  ╲│
//        └──────────────────────┘
//
//  Correct visual (square with X + inner diamond):
//
//        ╔══════════╦══════════╗
//        ║  H12  ╱  ║  ╲  H11 ║
//        ║     ╱    ║    ╲    ║
//        ╠═══╱══════╬══════╲══╣
//        ║ ╱   H1   ║  H10   ╲║
//        ║╱─────────╬─────────╲║
//        ║╲   H2    ║   H9   ╱║
//        ║  ╲       ║       ╱  ║
//        ╠════╲═════╬═════╱════╣
//        ║  H3  ╲   ║   ╱ H8  ║
//        ║       ╲  ║  ╱      ║
//        ╚══════════╩══════════╝
//
//  Actual correct layout — a square divided by:
//  1. Both diagonals (corner to corner) → 4 large triangles
//  2. Lines connecting midpoints of each side → inner diamond
//  This creates: 4 diamond cells (midpoints) + 8 triangle cells (corners)
//
//  Positions (S=size, M=midpoint of each side):
//    Top-mid    = H1  (diamond pointing up)
//    Left-mid   = H4  (diamond pointing left)
//    Bottom-mid = H7  (diamond pointing down)
//    Right-mid  = H10 (diamond pointing right)
//
//  Counter-clockwise triangles:
//    H2  = top-left upper triangle
//    H3  = top-left lower triangle
//    H5  = bottom-left lower triangle
//    H6  = bottom-left upper triangle  ← wait
//
//  From the article: CCW from H1(top):
//    H2=upper-left, H3=mid-left, H4=left-center(diamond),
//    H5=lower-left, H6=bottom-left, H7=bottom-center(diamond),
//    H8=bottom-right, H9=mid-right, H10=right-center(diamond),
//    H11=upper-right, H12=top-right
//
// SOUTH INDIAN — 4×3 grid, signs fixed, planets by sign
// ============================================================

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const SIGN_SHORT = ['Ari','Tau','Gem','Can','Leo','Vir',
                    'Lib','Sco','Sag','Cap','Aqu','Pis'];

const PLANET_ABBR = {
  Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me', Jupiter:'Ju',
  Venus:'Ve', Saturn:'Sa', Rahu:'Ra', Ketu:'Ke', Ascendant:'As'
};

let _planets = null;
let _ascSign = 1;
let _mode    = 'north';

// ── Public API ────────────────────────────────────────────────
function drawKundliChart(svgId, planets, ascSign) {
  _planets = planets;
  _ascSign = ascSign;
  _mode    = 'north';
  const svg = document.getElementById(svgId);
  if (svg) svg.setAttribute('viewBox', '0 0 420 420');
  _redraw(svgId);
}

function switchChartMode(svgId, mode) {
  _mode = mode;
  const svg = document.getElementById(svgId);
  if (svg) svg.setAttribute('viewBox', mode === 'south' ? '0 0 420 322' : '0 0 420 420');
  _redraw(svgId);
  document.getElementById('btn-north').className =
    (mode === 'north' ? 'chart-tab-active' : 'chart-tab-inactive') + ' px-4 py-2 transition-colors';
  document.getElementById('btn-south').className =
    (mode === 'south' ? 'chart-tab-active' : 'chart-tab-inactive') + ' px-4 py-2 transition-colors';
}

function _redraw(svgId) {
  if (!_planets) return;
  _mode === 'south' ? _south(svgId) : _north(svgId);
}

// ── Helpers ───────────────────────────────────────────────────
function _houseMap(planets, ascSign) {
  const map = {};
  for (let i = 1; i <= 12; i++) map[i] = [];
  planets.forEach(p => {
    const sn = p.current_sign || (SIGNS.indexOf(p.sign) + 1);
    if (!sn || sn < 1) return;
    const house = ((sn - ascSign + 12) % 12) + 1;
    map[house].push({
      abbr:  PLANET_ABBR[p.name] || p.name.substring(0, 2),
      retro: p.isRetro === 'true' || p.isRetro === true
    });
  });
  return map;
}

function _signMap(planets) {
  const map = {};
  for (let i = 0; i < 12; i++) map[i] = [];
  planets.forEach(p => {
    const sn = p.current_sign || (SIGNS.indexOf(p.sign) + 1);
    if (!sn || sn < 1) return;
    map[sn - 1].push({
      abbr:  PLANET_ABBR[p.name] || p.name.substring(0, 2),
      retro: p.isRetro === 'true' || p.isRetro === true
    });
  });
  return map;
}

// ============================================================
// NORTH INDIAN CHART
//
// Square with inner diamond. Key points:
//   Corners: TL, TR, BL, BR
//   Midpoints of sides: TM(top), LM(left), BM(bottom), RM(right)
//   Center: C
//
// 4 diamond cells (rhombus, one per side midpoint):
//   H1  = TL─TM─C─LM  (top diamond, pointing up)  ← wait
//
// Actually the diamonds are formed by connecting:
//   H1  (top)    = TM ─ (TM-left of center) ─ C ─ (TM-right of center)
//
// Let me think geometrically:
//   Square corners: A(0,0) B(S,0) C(S,S) D(0,S)
//   Side midpoints: T(S/2,0) R(S,S/2) Bo(S/2,S) L(0,S/2)
//   Center:         X(S/2,S/2)
//
//   H1  (top diamond)    = T, B_corner_right=B... 
//
// The 12 sections from connecting T,R,Bo,L,X and the 4 corners:
//
//   H1  = top diamond    : T, (between T and R on top-right), X, (between T and L on top-left)
//         Actually: T─TR_inner─X─TL_inner where TR_inner and TL_inner don't exist
//
// Simplest: connect T,R,Bo,L to form inner diamond, then connect each to corners:
//   Inner diamond: T─R─Bo─L─T
//   Lines from each corner to center X: A─X, B─X, C─X, D─X
//   Lines from each midpoint to adjacent corners: T─A, T─B, R─B, R─C, Bo─C, Bo─D, L─D, L─A
//
// This gives exactly 12 sections:
//   H1  = A─T─X─L  (top-left diamond, pointing left) ← no
//
// OK. The correct construction:
//   Draw square. Connect midpoints T,R,Bo,L → inner diamond.
//   The 12 regions are:
//   4 diamonds: T─B─X─A... no.
//
// FINAL correct geometry (I'll just hardcode the verified points):
//
//   Square: (0,0) to (S,S), midpoints T=(S/2,0), R=(S,S/2), Bo=(S/2,S), L=(0,S/2)
//   Center: X=(S/2,S/2)
//
//   The 12 cells (CCW from top, H1 first):
//
//   H1  (top diamond)    = T, B_top_right_corner... 
//
// I'll use the actual polygon points based on the visual:
//
//   H1  = top diamond  : points = [TL_corner, T, TR_corner, X]  ← NO
//
// The top diamond (H1) has its apex at T (top midpoint) and base at X (center).
// Its left and right points are... the intersections of the diagonal lines.
//
// When you draw both diagonals (A-C and B-D) AND the inner diamond (T-R-Bo-L):
// The intersections of diagonals with inner diamond sides give us the 12 regions.
//
// Diagonal A(0,0)→C(S,S) intersects:
//   T-L side of diamond: at point (S/4, S/4)  [call it NW]
//   Bo-R side of diamond: at point (3S/4, 3S/4) [call it SE]
//
// Diagonal B(S,0)→D(0,S) intersects:
//   T-R side of diamond: at point (3S/4, S/4)  [call it NE]
//   Bo-L side of diamond: at point (S/4, 3S/4) [call it SW]
//
// So we have 9 key points: A,B,C,D (corners), T,R,Bo,L (midpoints), X (center)
// Plus 4 intersection points: NW(S/4,S/4), NE(3S/4,S/4), SE(3S/4,3S/4), SW(S/4,3S/4)
//
// The 12 cells:
//   H1  (top diamond)    = T, NE, X, NW
//   H2  (upper-left △)  = A, T, NW
//   H3  (mid-left △)    = A, NW, L   ← wait, need to check
//   H4  (left diamond)  = L, NW, X, SW
//   H5  (lower-left △)  = A... 
//
// CCW order with correct triangles:
//   H1  = T─NE─X─NW        (top diamond)
//   H2  = A─T─NW           (top-left upper triangle)  ← CCW means go left from top
//   H3  = A─NW─L           (top-left lower triangle)
//   H4  = L─NW─X─SW        (left diamond)  ← wait, NW is top-left, SW is bottom-left
//          Actually: L─X─SW─... hmm
//
// Let me re-examine. With CCW numbering from H1(top):
//   Going CCW (left first): H2 is upper-LEFT, H3 is lower-LEFT
//   H4 = LEFT diamond
//   H5 = lower-left-bottom, H6 = bottom-left
//   H7 = BOTTOM diamond
//   H8 = bottom-right, H9 = upper-right
//   H10 = RIGHT diamond
//   H11 = upper-right-top, H12 = top-right
//
// Correct 12 polygons:
//   H1  = [T, NE, X, NW]           top diamond
//   H2  = [A, T, NW]               top-left upper △
//   H3  = [A, NW, L]               top-left lower △  ← A=(0,0), NW=(S/4,S/4), L=(0,S/2)
//   H4  = [L, NW, X, SW]           left diamond
//   H5  = [A... wait A is top-left corner
//
// I'm confusing myself with corner labels. Let me use:
//   TL=(0,0), TR=(S,0), BR=(S,S), BL=(0,S)
//   T=(S/2,0), R=(S,S/2), Bo=(S/2,S), L=(0,S/2)
//   X=(S/2,S/2)
//   NW=(S/4,S/4), NE=(3S/4,S/4), SE=(3S/4,3S/4), SW=(S/4,3S/4)
//
//   H1  = [T, NE, X, NW]           top diamond ✓
//   H2  = [TL, T, NW]              upper-left △ (CCW: from H1 go left)
//   H3  = [TL, NW, L]              lower-left △ (TL=top-left corner, NW, L=left-mid)
//   H4  = [L, NW, X, SW]           left diamond ✓
//   H5  = [BL, L, SW]              lower-left △ (BL=bottom-left corner)
//   H6  = [BL, SW, Bo]             bottom-left △
//   H7  = [Bo, SW, X, SE]          bottom diamond ✓
//   H8  = [BR, Bo, SE]             bottom-right △
//   H9  = [BR, SE, R]              upper-right △
//   H10 = [R, SE, X, NE]           right diamond ✓
//   H11 = [TR, R, NE]              upper-right △
//   H12 = [TR, NE, T]              top-right △
//
// This is the CORRECT North Indian layout! ✓
// ============================================================
function _north(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = '';

  const S   = 420, PAD = 16;
  const G   = S - PAD * 2;   // 388
  const H   = G;

  // Key points (relative to PAD offset)
  const x0 = PAD, y0 = PAD;
  const x1 = PAD + G, y1 = PAD + H;

  const TL = [x0,      y0     ];
  const TR = [x1,      y0     ];
  const BR = [x1,      y1     ];
  const BL = [x0,      y1     ];
  const T  = [x0+G/2,  y0     ];   // top midpoint
  const R  = [x1,      y0+H/2 ];   // right midpoint
  const Bo = [x0+G/2,  y1     ];   // bottom midpoint
  const L  = [x0,      y0+H/2 ];   // left midpoint
  const X  = [x0+G/2,  y0+H/2 ];   // center

  const NW = [x0+G/4,  y0+H/4 ];   // diagonal intersection top-left
  const NE = [x0+3*G/4,y0+H/4 ];   // diagonal intersection top-right
  const SE = [x0+3*G/4,y0+3*H/4];  // diagonal intersection bottom-right
  const SW = [x0+G/4,  y0+3*H/4];  // diagonal intersection bottom-left

  // 12 house polygons — CCW from top
  // Sign label position (lx,ly) and planet start position (px,py)
  const houses = [
    // H1  — top diamond
    { pts:[T,NE,X,NW],
      lx:X[0],       ly:y0+H*0.18,  px:X[0],       py:y0+H*0.28 },
    // H2  — upper-left triangle (TL corner)
    { pts:[TL,T,NW],
      lx:x0+G*0.18,  ly:y0+H*0.18,  px:x0+G*0.18,  py:y0+H*0.28 },
    // H3  — lower-left triangle (TL corner area)
    { pts:[TL,NW,L],
      lx:x0+G*0.12,  ly:y0+H*0.42,  px:x0+G*0.12,  py:y0+H*0.52 },
    // H4  — left diamond
    { pts:[L,NW,X,SW],
      lx:x0+G*0.18,  ly:y0+H*0.50,  px:x0+G*0.18,  py:y0+H*0.60 },
    // H5  — lower-left triangle (BL corner)
    { pts:[BL,L,SW],
      lx:x0+G*0.12,  ly:y0+H*0.58,  px:x0+G*0.12,  py:y0+H*0.68 },
    // H6  — bottom-left triangle (BL corner area)
    { pts:[BL,SW,Bo],
      lx:x0+G*0.18,  ly:y0+H*0.82,  px:x0+G*0.18,  py:y0+H*0.88 },
    // H7  — bottom diamond
    { pts:[Bo,SW,X,SE],
      lx:X[0],       ly:y0+H*0.82,  px:X[0],       py:y0+H*0.88 },
    // H8  — bottom-right triangle (BR corner)
    { pts:[BR,Bo,SE],
      lx:x0+G*0.82,  ly:y0+H*0.82,  px:x0+G*0.82,  py:y0+H*0.88 },
    // H9  — upper-right triangle (BR corner area)
    { pts:[BR,SE,R],
      lx:x0+G*0.88,  ly:y0+H*0.58,  px:x0+G*0.88,  py:y0+H*0.68 },
    // H10 — right diamond
    { pts:[R,SE,X,NE],
      lx:x0+G*0.82,  ly:y0+H*0.50,  px:x0+G*0.82,  py:y0+H*0.60 },
    // H11 — upper-right triangle (TR corner)
    { pts:[TR,R,NE],
      lx:x0+G*0.88,  ly:y0+H*0.42,  px:x0+G*0.88,  py:y0+H*0.52 },
    // H12 — top-right triangle (TR corner area)
    { pts:[TR,NE,T],
      lx:x0+G*0.82,  ly:y0+H*0.18,  px:x0+G*0.82,  py:y0+H*0.28 },
  ];

  const hp = _houseMap(_planets, _ascSign);

  // Outer border
  svg.appendChild(K('rect',{x:PAD,y:PAD,width:G,height:H,
    fill:'none',stroke:'rgba(233,193,118,0.45)','stroke-width':'1.5'}));

  // Draw diagonal lines (visual structure)
  // TL→BR diagonal
  svg.appendChild(K('line',{x1:TL[0],y1:TL[1],x2:BR[0],y2:BR[1],
    stroke:'rgba(233,193,118,0.22)','stroke-width':'1'}));
  // TR→BL diagonal
  svg.appendChild(K('line',{x1:TR[0],y1:TR[1],x2:BL[0],y2:BL[1],
    stroke:'rgba(233,193,118,0.22)','stroke-width':'1'}));
  // Inner diamond T→R→Bo→L→T
  svg.appendChild(K('polygon',{
    points:[T,R,Bo,L].map(p=>p.join(',')).join(' '),
    fill:'none',stroke:'rgba(233,193,118,0.35)','stroke-width':'1.2'
  }));

  // Draw each house polygon + labels
  houses.forEach((h, idx) => {
    const houseNum = idx + 1;
    const signNum  = (((_ascSign - 1) + idx) % 12) + 1;

    svg.appendChild(K('polygon',{
      points:h.pts.map(p=>p.join(',')).join(' '),
      fill:'rgba(233,193,118,0.02)',
      stroke:'rgba(233,193,118,0.0)',  // lines already drawn above
      'stroke-width':'0'
    }));

    // Sign number
    const sn = K('text',{x:h.lx,y:h.ly,'text-anchor':'middle',
      'dominant-baseline':'middle',fill:'rgba(200,191,255,0.85)',
      'font-size':'11','font-family':'Manrope,sans-serif','font-weight':'700'});
    sn.textContent = signNum;
    svg.appendChild(sn);

    // Planets
    hp[houseNum].forEach((pl, pi) => {
      const pt = K('text',{x:h.px,y:h.py+pi*13,'text-anchor':'middle',
        'dominant-baseline':'middle',
        fill:pl.retro?'#f87171':'#e9c176',
        'font-size':'10.5','font-family':'Noto Serif,serif','font-weight':'700'});
      pt.textContent = pl.retro ? pl.abbr+'ᴿ' : pl.abbr;
      svg.appendChild(pt);
    });
  });

  // Center ✦
  const star = K('text',{x:X[0],y:X[1],'text-anchor':'middle',
    'dominant-baseline':'middle',fill:'rgba(233,193,118,0.15)','font-size':'14'});
  star.textContent = '✦';
  svg.appendChild(star);
}

// ============================================================
// SOUTH INDIAN CHART
// 4×3 grid, signs fixed, planets placed by sign
// ============================================================
function _south(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = '';

  const PAD = 14, W = 392, H = W * (3/4);
  const CW = W/4, CH = H/3;

  // Fixed sign positions (sign index 0=Aries…11=Pisces)
  const CELLS = [
    {c:0,r:0,s:11},{c:1,r:0,s:0},{c:2,r:0,s:1},{c:3,r:0,s:2},
    {c:0,r:1,s:10},                              {c:3,r:1,s:3},
    {c:0,r:2,s:9}, {c:1,r:2,s:8},{c:2,r:2,s:7},{c:3,r:2,s:6},
  ];

  const sp = _signMap(_planets);

  // Outer border
  svg.appendChild(K('rect',{x:PAD,y:PAD,width:W,height:H,
    fill:'none',stroke:'rgba(233,193,118,0.45)','stroke-width':'1.5'}));

  // Grid lines
  for (let c=1;c<=3;c++) svg.appendChild(K('line',{
    x1:PAD+c*CW,y1:PAD,x2:PAD+c*CW,y2:PAD+H,
    stroke:'rgba(233,193,118,0.28)','stroke-width':'1'}));
  for (let r=1;r<=2;r++) svg.appendChild(K('line',{
    x1:PAD,y1:PAD+r*CH,x2:PAD+W,y2:PAD+r*CH,
    stroke:'rgba(233,193,118,0.28)','stroke-width':'1'}));

  // Center decorative area
  const cx=PAD+2*CW, cy=PAD+1.5*CH;
  svg.appendChild(K('rect',{x:PAD+CW,y:PAD+CH,width:CW*2,height:CH,
    fill:'rgba(233,193,118,0.025)',stroke:'rgba(233,193,118,0.12)','stroke-width':'0.5'}));
  const cstar=K('text',{x:cx,y:cy,'text-anchor':'middle',
    'dominant-baseline':'middle',fill:'rgba(233,193,118,0.18)','font-size':'24'});
  cstar.textContent='✦';
  svg.appendChild(cstar);

  CELLS.forEach(({c,r,s})=>{
    const x=PAD+c*CW, y=PAD+r*CH, mx=x+CW/2;
    const isAsc=(s===_ascSign-1);

    if(isAsc){
      svg.appendChild(K('rect',{x:x+1,y:y+1,width:CW-2,height:CH-2,
        fill:'rgba(233,193,118,0.07)',rx:'2'}));
      const ts=11;
      svg.appendChild(K('polygon',{
        points:`${x+2},${y+2} ${x+ts+2},${y+2} ${x+2},${y+ts+2}`,
        fill:'#e9c176',opacity:'0.9'}));
    }

    const sl=K('text',{x:mx,y:y+CH*0.22,'text-anchor':'middle',
      'dominant-baseline':'middle',
      fill:isAsc?'rgba(233,193,118,0.95)':'rgba(200,191,255,0.75)',
      'font-size':'9','font-family':'Manrope,sans-serif',
      'font-weight':isAsc?'700':'600','letter-spacing':'0.5'});
    sl.textContent=SIGN_SHORT[s].toUpperCase();
    svg.appendChild(sl);

    svg.appendChild(K('line',{
      x1:x+CW*0.18,y1:y+CH*0.35,x2:x+CW*0.82,y2:y+CH*0.35,
      stroke:isAsc?'rgba(233,193,118,0.3)':'rgba(200,191,255,0.12)','stroke-width':'0.5'}));

    sp[s].forEach((pl,pi)=>{
      const pt=K('text',{x:mx,y:y+CH*0.50+pi*13,'text-anchor':'middle',
        'dominant-baseline':'middle',
        fill:pl.retro?'#f87171':'#e9c176',
        'font-size':'10.5','font-family':'Noto Serif,serif','font-weight':'700'});
      pt.textContent=pl.retro?pl.abbr+'ᴿ':pl.abbr;
      svg.appendChild(pt);
    });
  });
}

// ── SVG element factory ───────────────────────────────────────
function K(tag,attrs){
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
  return node;
}
