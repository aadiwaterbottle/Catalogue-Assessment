const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: true
}));

// Serve static files (HTML/CSS/JS) from project root
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vinylvault',
  waitForConnections: true,
  connectionLimit: 10
});

// GET records from database
app.get('/api/records', (req, res) => {
  db.query('SELECT * FROM records', (err, results) => {
    if (err) {
      console.error('DB error /api/records', err);
      return res.json([]);
    }
    res.json(results);
  });
});

// ADD record to database
app.post('/api/add-record', (req, res) => {
  const { artist, album, release_year, image_url, genre } = req.body;
  const sql = `INSERT INTO records (artist, album, release_year, image_url, genre) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [artist, album, release_year, image_url, genre], (err, result) => {
    if (err) {
      console.error('DB error /api/add-record', err);
      return res.status(500).send('Error Adding Record');
    }
    res.send('Record Added');
  });
});

async function getSpotifyToken() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify credentials');
  }

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: process.env.SPOTIFY_CLIENT_ID,
        password: process.env.SPOTIFY_CLIENT_SECRET
      }
    }
  );

  return response.data.access_token;
}

app.get('/api/search-albums/:query', async (req, res) => {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.json([]);
    }

    const token = await getSpotifyToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(req.params.query)}&type=album&limit=12`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data.albums.items);
  } catch (error) {
    console.error(error.message || error);
    res.status(500).send('Spotify Error');
  }
});

// Spotify new releases
app.get('/api/spotify/new-releases', async (req, res) => {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.json([]);
    }
    const token = await getSpotifyToken();
    const response = await axios.get('https://api.spotify.com/v1/browse/new-releases?limit=24', {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(response.data.albums.items);
  } catch (err) {
    console.error('Spotify new releases error', err.message || err);
    res.status(500).json([]);
  }
});

// Popular records (from local DB)
app.get('/api/popular', (req, res) => {
  const sql = 'SELECT * FROM records ORDER BY created_at DESC LIMIT 24';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('DB error /api/popular', err);
      return res.json([]);
    }
    res.json(results);
  });
});

// Simple collection storage using session (no DB required to get site working)
app.post('/api/collection', (req, res) => {
  const { artist, album, image_url } = req.body;
  const userId = req.session.user ? req.session.user.id : null;
  const sql = `INSERT INTO collections (user_id, artist, album, image_url) VALUES (?, ?, ?, ?)`;
  db.query(sql, [userId, artist, album, image_url], (err, result) => {
    if (err) {
      console.error('DB error /api/collection', err);
      return res.status(500).send('Collection Error');
    }
    res.send('Added To Collection');
  });
});

app.get('/api/my-collection', (req, res) => {
  const userId = req.session.user ? req.session.user.id : null;
  let sql;
  let params = [];
  if (userId) {
    sql = 'SELECT * FROM collections WHERE user_id = ?';
    params = [userId];
  } else {
    // return anonymous collections (user_id IS NULL)
    sql = 'SELECT * FROM collections WHERE user_id IS NULL';
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('DB error /api/my-collection', err);
      return res.json([]);
    }
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
