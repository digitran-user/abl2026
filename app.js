// ===================================================
//  ABL 2026 — BADMINTON PLAYER AUCTION  app.js
//  Excel/CSV → player dashboard → live auction
// ===================================================

// ─── STATE ─────────────────────────────────────────
let players         = [];
let filteredPlayers = [];
let activeGender    = 'All';    // chip filter: All / Men / Women / Kids
let currentPlayer   = null;
let currentBid      = 0;
let selectedTeam    = null;
let bidHistory      = [];
let pendingRows     = [];

// ─── FRANCHISE TEAMS ───────────────────────────────
let teams = [
  { id:1,  name: 'Backhand Brigade',       logo: 'https://ui-avatars.com/api/?name=BB&background=6366f1&color=fff&size=64', budget: 8000, spent: 0 },
  { id:2,  name: 'Netflicks&Kill',         logo: 'https://ui-avatars.com/api/?name=NK&background=e11d48&color=fff&size=64', budget: 8000, spent: 0 },
  { id:3,  name: 'Club Shakti',            logo: 'https://ui-avatars.com/api/?name=CS&background=f59e0b&color=000&size=64', budget: 8000, spent: 0 },
  { id:4,  name: 'Big Dawgs',              logo: 'https://ui-avatars.com/api/?name=BD&background=0ea5e9&color=fff&size=64', budget: 8000, spent: 0 },
  { id:5,  name: 'Mavericks63',            logo: 'https://ui-avatars.com/api/?name=M6&background=7c3aed&color=fff&size=64', budget: 8000, spent: 0 },
  { id:6,  name: 'Dhurandhar Smash Squad', logo: 'https://ui-avatars.com/api/?name=DS&background=16a34a&color=fff&size=64', budget: 8000, spent: 0 },
  { id:7,  name: 'Shuttle Strikers',       logo: 'https://ui-avatars.com/api/?name=SS&background=f97316&color=fff&size=64', budget: 8000, spent: 0 },
  { id:8,  name: 'Court Commanders',       logo: 'https://ui-avatars.com/api/?name=CC&background=06b6d4&color=fff&size=64', budget: 8000, spent: 0 },
  { id:9,  name: 'Assetz Challengers',     logo: 'https://ui-avatars.com/api/?name=AC&background=dc2626&color=fff&size=64', budget: 8000, spent: 0 },
  { id:10, name: 'Supersonic',             logo: 'https://ui-avatars.com/api/?name=SN&background=4f46e5&color=fff&size=64', budget: 8000, spent: 0 },
  { id:11, name: 'Smash Syndicate',        logo: 'https://ui-avatars.com/api/?name=SY&background=be185d&color=fff&size=64', budget: 8000, spent: 0 },
  { id:12, name: 'Assetz Endless Rallies', logo: 'https://ui-avatars.com/api/?name=AE&background=0f766e&color=fff&size=64', budget: 8000, spent: 0 },
];

// ─── COLUMN MAP ────────────────────────────────────
// 'photo url' and 'skill' are FIRST so they match the exact Excel column names first
const COL_MAP = {
  name:        ['name','player name','player','full name','shuttler','athlete'],
  gender:      ['category'],
  category:    ['category','event','discipline','play type','badminton event','event category'],
  age:         ['age'],
  country:     ['country','nation','nationality'],
  base_price:  ['base price','baseprice','base','starting price','reserve price','price'],
  hand:        ['playing hand','hand','handedness','dominant hand','grip hand'],
  // 'skill' listed FIRST so Excel column "Skill" maps here, not 'assessment' etc.
  skill:       ['skill','self assessed skill','self assessment rating','self assessment',
                 'skill level','assessment','rating','level','proficiency'],
  experience:  ['playing experience','experience','years of experience','exp','years played',
                 'years experience','experience years','no of years'],
  last_played: ['last played','last active','last game','year last played','last year played',
                 'last played year'],
  // 'photo url' listed FIRST — exact match for Excel column header "Photo URL"
  photo:       ['photo url','photo','image','img','picture','pic url','profile photo','profile pic'],
  status:      ['status','availability'],
  sold_price:  ['sold price','sold for','final price'],
  sold_to:     ['sold to','team','bought by','franchise'],
};

// ─── SKILL LEVEL NORMALISER ────────────────────────
function normaliseSkill(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('adv'))   return 'Advanced';
  if (s.includes('int'))   return 'Intermediate';
  if (s.includes('beg') || s.includes('nov') || s.includes('new')) return 'Beginner';
  if (s === 'a')           return 'Advanced';
  if (s === 'i')           return 'Intermediate';
  if (s === 'b')           return 'Beginner';
  return raw ? String(raw).trim() : 'Intermediate';
}

// ─── GENDER NORMALISER ─────────────────────────────
function normaliseGender(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('wom') || s.includes('fem') || s === 'f') return 'Womens';
  if (s.includes('kid') || s.includes('jun') || s.includes('child') || s.includes('boy') || s.includes('girl') || s === 'k') return 'Kids';
  return 'Men'; // default
}

// ─── SKILL → color ─────────────────────────────────
function skillColor(skill) {
  if (!skill) return '#9199c4';
  const s = skill.toLowerCase();
  if (s.includes('adv'))   return '#a855f7';   // purple – Advanced
  if (s.includes('int'))   return '#f59e0b';   // amber  – Intermediate
  if (s.includes('beg'))   return '#22c55e';   // green  – Beginner
  return '#9199c4';
}

function skillIcon(skill) {
  const s = (skill || '').toLowerCase();
  if (s.includes('adv')) return '⭐';
  if (s.includes('int')) return '🔵';
  if (s.includes('beg')) return '🟢';
  return '🎯';
}

// ─── GENDER → color ────────────────────────────────
function genderColor(gender) {
  if (!gender) return '#6366f1';
  const g = gender.toLowerCase();
  if (g === 'womens' || g === 'women') return '#ec4899';
  if (g === 'kids')  return '#22c55e';
  return '#6366f1'; // Men
}

// avatarUrl — the coloured-initials fallback used in onerror handlers
function avatarUrl(p) {
  const bg = skillColor(p.skill).replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=${bg}&color=fff&size=400&font-size=0.38&bold=true`;
}

// resolvePhotoUrl — converts any share link to a directly embeddable image URL.
// Returns null for non-URL strings so the avatar fallback kicks in.
function resolvePhotoUrl(url) {
  if (!url || url.trim() === '') return null;
  const u = url.trim();

  // ── Google Drive share link ──────────────────────────────────────────────
  // Input:  https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
  // Output: https://lh3.googleusercontent.com/d/{FILE_ID}  (best for embedding)
  const gdFile = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gdFile) {
    const id = gdFile[1];
    // Primary: lh3 CDN — works without auth for publicly shared files
    return `https://lh3.googleusercontent.com/d/${id}`;
  }

  // ── Google Drive open/sharing URL with ?id= param ────────────────────────
  const gdId = u.match(/drive\.google\.com.*[?&]id=([\w-]+)/);
  if (gdId) return `https://lh3.googleusercontent.com/d/${gdId[1]}`;

  // ── OneDrive ─────────────────────────────────────────────────────────────
  if (u.includes('1drv.ms') || u.includes('onedrive.live.com'))
    return u.replace('redir?', 'download?').replace('embed?', 'download?');

  // ── Any standard HTTP/HTTPS URL ───────────────────────────────────────────
  if (u.startsWith('http://') || u.startsWith('https://')) return u;

  // ── Anything else (local path, junk) — use avatar fallback ───────────────
  return null;
}

function photoSrc(p) {
  const resolved = resolvePhotoUrl(p.photo);
  return resolved || avatarUrl(p);  // resolved = direct URL from Excel; fallback = coloured avatar
}

// ─── HELPERS ───────────────────────────────────────
function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9 %/]/g, '').trim();
}

function buildColIndex(headers) {
  const index = {};
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h);
    for (const [key, aliases] of Object.entries(COL_MAP)) {
      if (aliases.includes(norm) && index[key] === undefined) index[key] = i;
    }
  });
  return index;
}

function parsePrice(val) {
  if (val === undefined || val === null || val === '') return 0;
  return parseFloat(String(val).replace(/[₹,\s]/g, '')) || 0;
}

function fmtPrice(val) {
  if (!val || val === 0) return '—';
  return '₹' + Number(val).toLocaleString('en-IN');
}

// ─── TAB SWITCHING ─────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'auction') renderQueue();
}

// ─── FILE HANDLING ─────────────────────────────────
function handleFileSelect(e) { const f = e.target.files[0]; if (f) readFile(f); }
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const f = e.dataTransfer.files[0]; if (f) readFile(f);
}

function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  if (ext === 'csv') {
    reader.onload = e => parseCSV(e.target.result, file.name);
    reader.readAsText(file);
  } else {
    reader.onload = e => {
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      processRows(rows, file.name);
    };
    reader.readAsArrayBuffer(file);
  }
}

function parseCSV(text, fileName) {
  const lines = text.split('\n').map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
  processRows(lines, fileName);
}

function processRows(rows, fileName) {
  if (rows.length < 2) { toast('File is empty or has no data.', 'error'); return; }
  const headers = rows[0];
  const colIdx  = buildColIndex(headers);
  pendingRows   = { headers, colIdx, data: rows.slice(1).filter(r => r.some(c => c !== '')) };
  renderPreview(fileName, headers, pendingRows.data);
  toast(`📊 Loaded ${pendingRows.data.length} players from "${fileName}"`, 'success');
}

function renderPreview(fileName, headers, data) {
  const card  = document.getElementById('preview-card');
  const table = document.getElementById('preview-table');
  document.getElementById('preview-title').textContent = fileName;
  document.getElementById('preview-count').textContent = data.length + ' rows';
  const showCols = Math.min(headers.length, 8);
  const showRows = Math.min(data.length, 30);
  let html = '<thead><tr>' + headers.slice(0, showCols).map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
  for (let i = 0; i < showRows; i++)
    html += '<tr>' + data[i].slice(0, showCols).map(c => `<td>${c}</td>`).join('') + '</tr>';
  if (data.length > showRows)
    html += `<tr><td colspan="${showCols}" style="text-align:center;color:var(--text-muted);padding:.75rem">…and ${data.length - showRows} more rows</td></tr>`;
  html += '</tbody>';
  table.innerHTML = html;
  card.style.display = 'flex';
}

function importData() {
  if (!pendingRows || !pendingRows.data) { toast('No file loaded.', 'error'); return; }
  const { colIdx, data } = pendingRows;

  const imported = data.map((row, idx) => {
    const get = (key, fallback = '') => {
      const i = colIdx[key];
      return (i !== undefined && row[i] !== undefined) ? String(row[i]).trim() : fallback;
    };
    const status = get('status', 'Available');
    const skill  = normaliseSkill(get('skill', 'Intermediate'));
    // Base price is always derived from skill level:
    //   Advanced  → ₹10,000   |   Intermediate / Beginner  → ₹1,000
    const base_price = skill === 'Advanced' ? 10000 : 1000;
    return {
      id:          idx + 1,
      name:        get('name') || `Player ${idx + 1}`,
      gender:      normaliseGender(get('gender', 'Men')),
      category:    get('category', '—'),
      age:         get('age', '—'),
      country:     get('country', '—'),
      base_price,
      hand:        get('hand', '—'),
      skill,
      experience:  get('experience', '—'),
      last_played: get('last_played', '—'),
      photo:       get('photo', ''),
      status:      /sold/i.test(status) ? 'Sold' : /unsold/i.test(status) ? 'Unsold' : 'Available',
      sold_price:  parsePrice(get('sold_price')),
      sold_to:     get('sold_to', ''),
    };
  }).filter(p => p.name && p.name.trim() !== '');

  players = imported;
  filteredPlayers = [...players];
  updateStats();
  renderPlayerGrid();
  renderQueue();
  toast(`✅ ${players.length} players imported!`, 'success');
  pendingRows = [];
}

function clearData() {
  pendingRows = [];
  document.getElementById('preview-card').style.display = 'none';
  document.getElementById('file-input').value = '';
  toast('Preview cleared.', '');
}

// ─── TEMPLATE DOWNLOAD ─────────────────────────────
function downloadTemplate() {
  const headers = ['Name','Gender','Category','Age','Country','Base Price','Playing Hand',
                   'Self Assessed Skill','Playing Experience','Last Played','Photo URL','Status'];
  const sample  = [
    ['Arjun Singhania','Men','Singles',24,'India',200,'Right','Advanced','8 years',2024,'','Available'],
    ['Priya Nandan','Women','Doubles',22,'India',180,'Left','Intermediate','5 years',2023,'','Available'],
    ['Ravi Kumar','Kids','Singles',16,'India',100,'Right','Beginner','2 years',2024,'','Available'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  XLSX.writeFile(wb, 'abl2026_auction_template.xlsx');
  toast('📥 Template downloaded!', 'success');
}

// ─── SAMPLE DATA ───────────────────────────────────
function loadSampleData() {
  players = [
    { id:1,  name:'Arjun Singhania',  gender:'Men',    category:'Singles', age:28, country:'India',    base_price:10000, hand:'Right', skill:'Advanced',     experience:'8 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:2,  name:'Priya Nandan',     gender:'Womens', category:'Doubles', age:24, country:'India',    base_price:10000, hand:'Left',  skill:'Advanced',     experience:'6 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:3,  name:'Lee Jae-hyun',     gender:'Men',    category:'Singles', age:27, country:'Korea',    base_price:10000, hand:'Left',  skill:'Advanced',     experience:'10 yrs', last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:4,  name:'Siti Rahayu',      gender:'Womens', category:'Singles', age:25, country:'Malaysia', base_price:1000,  hand:'Right', skill:'Intermediate', experience:'5 yrs',  last_played:2023, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:5,  name:'Fajar Putra',      gender:'Men',    category:'Doubles', age:26, country:'Indonesia',base_price:10000, hand:'Right', skill:'Advanced',     experience:'9 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:6,  name:'Rian Ardianto',    gender:'Men',    category:'Doubles', age:25, country:'Indonesia',base_price:1000,  hand:'Right', skill:'Intermediate', experience:'7 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:7,  name:'Chen Qing-chen',   gender:'Womens', category:'Doubles', age:28, country:'China',    base_price:10000, hand:'Right', skill:'Advanced',     experience:'12 yrs', last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:8,  name:'Jia Yi-Fan',       gender:'Womens', category:'Doubles', age:27, country:'China',    base_price:10000, hand:'Left',  skill:'Advanced',     experience:'11 yrs', last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:9,  name:'Zheng Si-Wei',     gender:'Men',    category:'Mixed',   age:26, country:'China',    base_price:10000, hand:'Right', skill:'Advanced',     experience:'9 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:10, name:'Ananya Rao',       gender:'Womens', category:'Singles', age:20, country:'India',    base_price:1000,  hand:'Right', skill:'Intermediate', experience:'4 yrs',  last_played:2023, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:11, name:'Dev Mehra',        gender:'Kids',   category:'Singles', age:16, country:'India',    base_price:1000,  hand:'Right', skill:'Beginner',     experience:'2 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:12, name:'Aisha Khan',       gender:'Kids',   category:'Doubles', age:15, country:'India',    base_price:1000,  hand:'Left',  skill:'Beginner',     experience:'1 yr',   last_played:2023, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:13, name:'Anders Antonsen',  gender:'Men',    category:'Singles', age:26, country:'Denmark',  base_price:10000, hand:'Left',  skill:'Advanced',     experience:'8 yrs',  last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
    { id:14, name:'Tai Tzu-Ying',     gender:'Womens', category:'Singles', age:29, country:'Taiwan',   base_price:10000, hand:'Left',  skill:'Advanced',     experience:'14 yrs', last_played:2024, photo:'', status:'Available', sold_price:0, sold_to:'' },
  ];
  filteredPlayers = [...players];
  updateStats();
  renderPlayerGrid();
  renderQueue();
  toast('🏸 Sample roster loaded — ABL 2026!', 'success');
}

// ─── STATS ─────────────────────────────────────────
function updateStats() {
  const total     = players.length;
  const sold      = players.filter(p => p.status === 'Sold').length;
  const available = players.filter(p => p.status === 'Available').length;
  const spent     = players.filter(p => p.status === 'Sold').reduce((a, p) => a + (p.sold_price || p.base_price), 0);
  document.getElementById('stat-total-val').textContent  = total;
  document.getElementById('stat-avail-val').textContent  = available;
  document.getElementById('stat-sold-val').textContent   = sold;
  document.getElementById('stat-budget-val').textContent = '₹' + Number(spent).toLocaleString('en-IN');
  document.getElementById('player-count-badge').textContent = total + ' Players';
}

// ─── GENDER CHIP FILTER ─────────────────────────────
function setGenderFilter(gender, btn) {
  activeGender = gender;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  filterPlayers();
}

// ─── FILTER + SKILL DROPDOWN ───────────────────────
function filterPlayers() {
  const q        = document.getElementById('search-input').value.toLowerCase();
  const skillSel = document.getElementById('skill-filter').value; // advanced / intermediate / beginner / sold_price / all

  filteredPlayers = players.filter(p => {
    // Gender chip filter
    const matchGender = activeGender === 'All' || p.gender === activeGender;

    // Skill dropdown filter
    let matchSkill = true;
    if (skillSel === 'advanced')     matchSkill = p.skill === 'Advanced';
    if (skillSel === 'intermediate') matchSkill = p.skill === 'Intermediate';
    if (skillSel === 'beginner')     matchSkill = p.skill === 'Beginner';
    if (skillSel === 'sold_price')   matchSkill = p.status === 'Sold';

    // Text search
    const matchQ = !q
      || p.name.toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q)
      || (p.skill || '').toLowerCase().includes(q)
      || (p.country || '').toLowerCase().includes(q)
      || (p.sold_to || '').toLowerCase().includes(q);

    return matchGender && matchSkill && matchQ;
  });

  // Sort: sold_price mode → descending sold price; otherwise alphabetical
  if (skillSel === 'sold_price') {
    filteredPlayers.sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0));
  } else {
    filteredPlayers.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderPlayerGrid();
}

// ─── RENDER PLAYER CARDS ───────────────────────────
function renderPlayerGrid() {
  const grid = document.getElementById('player-grid');

  if (filteredPlayers.length === 0) {
    grid.innerHTML = players.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">🏸</div>
           <h3>No Players Loaded</h3>
           <p>Upload an Excel file in the <strong>Upload Players</strong> tab to get started.</p>
           <button class="btn-primary" onclick="switchTab('upload')">Upload Excel</button>
         </div>`
      : `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No players found</h3><p>Try a different search or filter.</p></div>`;
    return;
  }

  grid.innerHTML = filteredPlayers.map(p => {
    const statusClass = `status-${p.status.toLowerCase()}`;
    const img         = photoSrc(p);
    const sc          = skillColor(p.skill);
    const gc          = genderColor(p.gender);

    const auctionBtn = p.status === 'Available'
      ? `<button class="btn-auction" onclick="event.stopPropagation(); startAuction(${p.id})">🔨 Bid</button>`
      : `<button class="btn-auction" disabled>${p.status}</button>`;

    const priceRow = p.status === 'Sold'
      ? `<div class="player-price-row">
           <span class="base-price">Base: ${fmtPrice(p.base_price)}</span>
           <div style="text-align:right">
             <div class="sold-price">${fmtPrice(p.sold_price || p.base_price)}</div>
             ${p.sold_to ? `<div class="sold-team">${p.sold_to}</div>` : ''}
           </div>
         </div>`
      : `<div class="player-price-row">
           <span class="base-price">Base Price</span>
           <div class="sold-price">${fmtPrice(p.base_price)}</div>
         </div>`;

    return `
      <div class="player-card" id="player-card-${p.id}" onclick="openModal(${p.id})">

        <!-- ── HERO PHOTO HEADER ── -->
        <div class="player-card-header">

          <!-- Full-bleed profile photo (from Excel Photo URL or avatar fallback) -->
          <img class="player-photo" src="${img}" alt="${p.name}"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=${skillColor(p.skill).replace('#','')}&color=fff&size=400&font-size=0.38&bold=true'" />

          <!-- Gradient scrim over photo -->
          <div class="photo-scrim"></div>

          <!-- Status badge: top-right -->
          <div class="player-status-badge ${statusClass}">${p.status}</div>

          <!-- Gender pill: top-left -->
          <div class="gender-pill" style="background:${gc}28;color:${gc};border-color:${gc}60">${p.gender}</div>

          <!-- Name + skill overlaid at photo bottom -->
          <div class="photo-name-strip">
            <div class="photo-strip-name" title="${p.name}">${p.name}</div>
            <div class="photo-strip-sub">
              <span class="skill-badge" style="color:${sc};background:${sc}28;border-color:${sc}55;margin-bottom:0;font-size:.68rem;padding:.15rem .6rem">
                ${skillIcon(p.skill)} ${p.skill}
              </span>
              ${p.country && p.country !== '—' ? `<span style="font-size:.7rem;color:rgba(255,255,255,0.65)">🌍 ${p.country}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- ── CARD BODY ── -->
        <div class="player-card-body">

          <!-- Category -->
          <div class="player-category">🏸 ${p.category || '—'}</div>

          <!-- Mini-stat grid: Experience · Last Played · Hand · Age -->
          <div class="player-card-stats">
            <div class="mini-stat">
              <div class="mini-stat-val">${p.experience || '—'}</div>
              <div class="mini-stat-lbl">Experience</div>
            </div>
            <div class="mini-stat">
              <div class="mini-stat-val">${p.last_played || '—'}</div>
              <div class="mini-stat-lbl">Last Played</div>
            </div>
            <div class="mini-stat">
              <div class="mini-stat-val">${p.hand || '—'}</div>
              <div class="mini-stat-lbl">Hand</div>
            </div>
            <div class="mini-stat">
              <div class="mini-stat-val">${p.age !== '—' ? p.age + 'y' : '—'}</div>
              <div class="mini-stat-lbl">Age</div>
            </div>
          </div>

          ${priceRow}
          ${auctionBtn}
        </div>
      </div>`;
  }).join('');
}

// ─── PLAYER DETAIL MODAL ──────────────────────────
function openModal(id) {
  const p = players.find(x => x.id === id);
  if (!p) return;
  const img         = photoSrc(p);
  const statusClass = `status-${p.status.toLowerCase()}`;
  const sc          = skillColor(p.skill);
  const gc          = genderColor(p.gender);

  const content = `
    <div class="modal-player-header">
      <img class="modal-photo" src="${img}" alt="${p.name}"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff&size=200'" />
      <div class="modal-player-info">
        <!-- Skill + Gender badges -->
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">
          <span class="modal-role-badge" style="color:${sc};border-color:${sc}40;background:${sc}18">
            ${skillIcon(p.skill)} ${p.skill}
          </span>
          <span class="modal-role-badge" style="color:${gc};border-color:${gc}40;background:${gc}18">
            ${p.gender}
          </span>
        </div>
        <div class="modal-name">${p.name}</div>
        <div class="modal-meta-row">
          ${p.category ? `<span>🏸 ${p.category}</span>` : ''}
          ${p.age && p.age !== '—' ? `<span>🎂 Age: ${p.age}</span>` : ''}
          ${p.country && p.country !== '—' ? `<span>🌍 ${p.country}</span>` : ''}
          ${p.hand && p.hand !== '—' ? `<span>🖐 ${p.hand}-handed</span>` : ''}
        </div>
        <div style="margin-top:.75rem">
          <span class="player-status-badge ${statusClass}" style="position:static;display:inline-block">${p.status}</span>
        </div>
      </div>
    </div>

    <!-- Key Stats Grid -->
    <div class="modal-stats-grid">
      <div class="modal-stat">
        <div class="modal-stat-val" style="font-size:1.1rem">${p.skill || '—'}</div>
        <div class="modal-stat-lbl">Self Assessed Skill</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val">${p.experience || '—'}</div>
        <div class="modal-stat-lbl">Playing Experience</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val">${p.last_played || '—'}</div>
        <div class="modal-stat-lbl">Last Played</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val">${p.category || '—'}</div>
        <div class="modal-stat-lbl">Category</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val">${p.gender || '—'}</div>
        <div class="modal-stat-lbl">Gender</div>
      </div>
      <div class="modal-stat">
        <div class="modal-stat-val">${p.hand || '—'}</div>
        <div class="modal-stat-lbl">Playing Hand</div>
      </div>
    </div>

    <!-- Price Row -->
    <div class="modal-price-row">
      <div class="modal-price-item">
        <div class="modal-price-label">Base Price</div>
        <div class="modal-price-val">${fmtPrice(p.base_price)}</div>
      </div>
      ${p.status === 'Sold' ? `
      <div class="modal-price-item">
        <div class="modal-price-label">Sold For</div>
        <div class="modal-price-val" style="color:var(--success)">${fmtPrice(p.sold_price || p.base_price)}</div>
      </div>
      <div class="modal-price-item">
        <div class="modal-price-label">Franchise</div>
        <div class="modal-price-val" style="font-size:1rem">${p.sold_to || '—'}</div>
      </div>` : ''}
    </div>

    <div class="modal-footer">
      ${p.status === 'Available'
        ? `<button class="btn-primary" onclick="closeModal(); startAuction(${p.id})">🔨 Start Auction</button>`
        : ''}
      <button class="btn-secondary" onclick="closeModal()">Close</button>
    </div>`;

  document.getElementById('modal-content').innerHTML = content;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ─── AUCTION QUEUE ─────────────────────────────────
function renderQueue() {
  const list      = document.getElementById('queue-list');
  const available = players.filter(p => p.status === 'Available');
  if (available.length === 0) {
    list.innerHTML = players.length === 0
      ? '<p class="queue-empty">No players loaded. Import data first.</p>'
      : '<p class="queue-empty">All players auctioned! 🏸</p>';
    return;
  }
  list.innerHTML = available.map(p => `
    <div class="queue-item ${currentPlayer && currentPlayer.id === p.id ? 'active-player' : ''}"
         id="queue-${p.id}" onclick="startAuction(${p.id})">
      <img class="queue-photo" src="${photoSrc(p)}" alt="${p.name}"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff&size=64'" />
      <div>
        <div class="queue-name">${p.name}</div>
        <div class="queue-role">${p.gender} • ${p.skill} • ${fmtPrice(p.base_price)}</div>
      </div>
    </div>`).join('');
}

// ─── START AUCTION ─────────────────────────────────
function startAuction(id) {
  const p = players.find(x => x.id === id);
  if (!p || p.status !== 'Available') { toast('Player not available.', 'error'); return; }

  currentPlayer = p;
  currentBid    = p.base_price;
  selectedTeam  = null;
  bidHistory    = [];

  switchTab('auction');

  document.getElementById('spotlight-empty').style.display  = 'none';
  document.getElementById('spotlight-player').style.display = 'flex';
  document.getElementById('bid-panel').style.display        = 'block';

  document.getElementById('sp-photo').src = photoSrc(p);
  document.getElementById('sp-role').textContent  = `${p.gender} · ${p.skill}`;
  document.getElementById('sp-role').style.color  = skillColor(p.skill);
  document.getElementById('sp-name').textContent  = p.name;
  document.getElementById('sp-country').textContent = p.country !== '—' ? '🌍 ' + p.country : '';
  document.getElementById('sp-age').textContent = p.age && p.age !== '—' ? `🎂 Age: ${p.age}` : '';
  document.getElementById('sp-base').textContent = fmtPrice(p.base_price);
  document.getElementById('sp-current-bid').textContent = fmtPrice(currentBid);

  document.getElementById('sp-stats').innerHTML = `
    <div class="sp-stat-item"><div class="sp-stat-v" style="font-size:1rem">${p.skill||'—'}</div><div class="sp-stat-l">Skill Level</div></div>
    <div class="sp-stat-item"><div class="sp-stat-v" style="font-size:1rem">${p.experience||'—'}</div><div class="sp-stat-l">Experience</div></div>
    <div class="sp-stat-item"><div class="sp-stat-v">${p.last_played||'—'}</div><div class="sp-stat-l">Last Played</div></div>
    <div class="sp-stat-item"><div class="sp-stat-v" style="font-size:1rem">${p.category||'—'}</div><div class="sp-stat-l">Category</div></div>`;

  document.getElementById('team-selector').innerHTML = teams.map(t => `
    <button class="team-btn" id="team-btn-${t.id}" onclick="selectTeam(${t.id})">
      <img class="team-logo" src="${t.logo}" alt="${t.name}"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(t.name.substring(0,2))}&background=6366f1&color=fff&size=64'" />
      <span>${t.name}</span>
      <span style="margin-left:auto;color:var(--text-muted);font-size:.75rem">₹${Number(t.budget - t.spent).toLocaleString()}L</span>
    </button>`).join('');

  const base = p.base_price || 10;
  const increments = [base * 0.1, base * 0.25, base * 0.5, base]
    .map(v => Math.round(v / 5) * 5)
    .filter((v, i, a) => a.indexOf(v) === i && v > 0);
  document.getElementById('bid-quick-btns').innerHTML = increments.map(v =>
    `<button class="quick-btn" onclick="quickAdd(${v})">+${v}L</button>`).join('');

  document.getElementById('bid-input').value       = '';
  document.getElementById('bid-history').innerHTML = '';

  document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('active-player'));
  const qEl = document.getElementById('queue-' + id);
  if (qEl) { qEl.classList.add('active-player'); qEl.scrollIntoView({ behavior:'smooth', block:'nearest' }); }

  toast(`🔨 Auction started for ${p.name}!`, 'success');
}

function selectTeam(id) {
  selectedTeam = teams.find(t => t.id === id);
  document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('team-btn-' + id);
  if (btn) btn.classList.add('selected');
}

function quickAdd(v) {
  const inp = document.getElementById('bid-input');
  inp.value = (parseFloat(inp.value) || currentBid) + v;
}

function placeBid() {
  if (!currentPlayer) { toast('No player selected.', 'error'); return; }
  if (!selectedTeam)  { toast('Please select a franchise first.', 'error'); return; }
  const bidVal = parseFloat(document.getElementById('bid-input').value);
  if (!bidVal || bidVal <= currentBid) {
    toast(`Bid must exceed current bid (${fmtPrice(currentBid)}).`, 'error'); return;
  }
  currentBid = bidVal;
  document.getElementById('sp-current-bid').textContent = fmtPrice(currentBid);
  bidHistory.push({ team: selectedTeam.name, amount: currentBid });
  document.getElementById('bid-history').innerHTML = bidHistory.slice().reverse().map(e =>
    `<div class="bid-entry">
       <span class="bid-entry-team">${e.team}</span>
       <span class="bid-entry-amount">${fmtPrice(e.amount)}</span>
     </div>`).join('');
  document.getElementById('bid-input').value = '';
  toast(`💰 ${selectedTeam.name} bids ${fmtPrice(currentBid)}!`, 'success');
}

function markSold() {
  if (!currentPlayer) { toast('No active auction.', 'error'); return; }
  if (!selectedTeam)  { toast('Select the winning franchise first.', 'error'); return; }
  const p = players.find(x => x.id === currentPlayer.id);
  p.status = 'Sold'; p.sold_price = currentBid; p.sold_to = selectedTeam.name;
  const team = teams.find(t => t.id === selectedTeam.id);
  if (team) team.spent += currentBid;
  updateStats(); filterPlayers(); renderQueue(); resetAuction();
  toast(`🏷️ ${p.name} sold to ${p.sold_to} for ${fmtPrice(p.sold_price)}!`, 'success');
}

function markUnsold() {
  if (!currentPlayer) { toast('No active auction.', 'error'); return; }
  const p = players.find(x => x.id === currentPlayer.id);
  p.status = 'Unsold';
  updateStats(); filterPlayers(); renderQueue(); resetAuction();
  toast(`❌ ${p.name} marked as Unsold.`, '');
}

function resetAuction() {
  currentPlayer = null; currentBid = 0; selectedTeam = null; bidHistory = [];
  document.getElementById('spotlight-empty').style.display  = 'flex';
  document.getElementById('spotlight-player').style.display = 'none';
  document.getElementById('bid-panel').style.display        = 'none';
}

// ─── TOAST ─────────────────────────────────────────
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ─── INIT ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', loadSampleData);
