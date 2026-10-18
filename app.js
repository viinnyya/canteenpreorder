require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Stage 1 placeholder route: confirms the server and database are connected.
// Replaced by real routes in the next stages.
app.get('/', (req, res) => {
  const stallCount = db.prepare('SELECT COUNT(*) AS n FROM stalls').get().n;
  res.send(`Canteen Pre-Order server is running. Stalls in database: ${stallCount}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
