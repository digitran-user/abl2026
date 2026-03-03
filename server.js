// ===================================================
//  ABL 2026 — Express + MongoDB backend server
//  Serves the static frontend and exposes /api/players
// ===================================================
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB connection ────────────────────────────
// Change MONGO_URI to your connection string if needed.
// Default: local MongoDB on the same machine.
const MONGO_URI = "mongodb+srv://eagerlearners2k_db_user:jWgkKHwCy9bh548g@cluster0.65ouz45.mongodb.net/playerDetails";

mongoose.connect(MONGO_URI)
  .then(() => console.log(`✅  MongoDB connected → ${MONGO_URI}`))
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    console.log('ℹ️   The server will still serve the frontend; DB features will be unavailable.');
  });

// ── Player schema ─────────────────────────────────
const playerSchema = new mongoose.Schema({
  // We store the id from the Excel import so re-imports stay stable
  importId:    { type: Number, required: true },
  name:        { type: String, required: true },
  gender:      String,
  category:    String,
  age:         mongoose.Schema.Types.Mixed,
  country:     String,
  base_price:  { type: Number, default: 0 },
  hand:        String,
  skill:       String,
  experience:  String,
  last_played: mongoose.Schema.Types.Mixed,
  photo:       String,
  status:      { type: String, default: 'Available' },
  sold_price:  { type: Number, default: 0 },
  sold_to:     String,
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

// ── Middleware ────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve frontend static files from the same folder
app.use(express.static(path.join(__dirname)));

// ── API routes ────────────────────────────────────

// GET /api/players  — fetch all players from DB
app.get('/api/players', async (req, res) => {
  try {
    const docs = await Player.find({}).sort({ importId: 1 }).lean();
    // Remap _id → id for the frontend
    const players = docs.map(d => ({ ...d, id: d.importId }));
    res.json({ ok: true, players });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/players  — bulk save (replaces ALL existing players)
app.post('/api/players', async (req, res) => {
  try {
    const incoming = req.body.players;
    if (!Array.isArray(incoming) || incoming.length === 0)
      return res.status(400).json({ ok: false, error: 'players array is required' });

    // Delete old roster, insert new one
    await Player.deleteMany({});
    const docs = incoming.map(p => ({ ...p, importId: p.id }));
    const inserted = await Player.insertMany(docs);
    res.json({ ok: true, saved: inserted.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/players/:importId  — update a single player (sold/unsold result)
app.patch('/api/players/:importId', async (req, res) => {
  try {
    const doc = await Player.findOneAndUpdate(
      { importId: Number(req.params.importId) },
      { $set: req.body },
      { new: true }
    );
    if (!doc) return res.status(404).json({ ok: false, error: 'Player not found' });
    res.json({ ok: true, player: { ...doc.toObject(), id: doc.importId } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/players  — wipe all players
app.delete('/api/players', async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Catch-all: return index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  ABL 2026 server running at http://localhost:${PORT}`);
  console.log('   Dashboard  → http://localhost:' + PORT);
});
