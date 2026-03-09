// croplogos.mjs — crops team logos from the grid image using Canvas (via @napi-rs/canvas)
// Run: node croplogos.mjs
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

mkdirSync('logos', { recursive: true });

const GRID = 'C:/Users/Admin/.gemini/antigravity/brain/b0091cb1-920a-4923-95e5-5ba8674d1b90/media__1772529710721.jpg';
const ABL  = 'C:/Users/Admin/.gemini/antigravity/brain/b0091cb1-920a-4923-95e5-5ba8674d1b90/media__1772529498731.png';

const teams = [
  'backhand_brigade','netflicks_kill','club_shakti','big_dawgs',
  'mavericks63','dhurandhar_smash_squad','shuttle_strikers','court_commanders',
  'assetz_challengers','supersonic','smash_syndicate','assetz_endless_rallies'
];

function makeCircle(src, sx, sy, sw, sh, size = 200) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toBuffer('image/png');
}

async function main() {
  // ── ABL Logo ──────────────────────────────────────
  const abl = await loadImage(ABL);
  const s   = Math.min(abl.width, abl.height);
  const ablBuf = makeCircle(abl, (abl.width-s)/2, (abl.height-s)/2, s, s, 200);
  writeFileSync('logos/abl_logo.png', ablBuf);
  console.log('✅ abl_logo.png');

  // ── Team logos grid ───────────────────────────────
  const grid = await loadImage(GRID);
  const GW = grid.width, GH = grid.height;
  console.log(`Grid: ${GW}x${GH}`);
  const cw = GW / 4, ch = GH / 3;
  // Use top 62% of each cell to cut out only the artwork (not team name text)
  const logoH = ch * 0.62;

  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const buf = makeCircle(grid, col * cw, row * ch, cw, logoH, 200);
    const filename = `logos/${teams[i]}.png`;
    writeFileSync(filename, buf);
    console.log(`✅ ${filename}`);
  }
  console.log('\n🎉 All 13 logos saved to logos/');
}

main().catch(e => { console.error(e); process.exit(1); });
