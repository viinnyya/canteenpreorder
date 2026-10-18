require('dotenv').config();
const express = require('express');
const path = require('path');
const sessionMiddleware = require('./config/session');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helpers every EJS view can use.
app.locals.orderStatus = require('./config/orderStatus');
app.locals.peso = (n) => '₱' + Number(n).toFixed(2);
app.locals.formatTime = (s) =>
  new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(sessionMiddleware);

// Make the logged-in user available to every EJS view as `user`.
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(require('./routes'));

app.use((req, res) => {
  res.status(404).render('errors/404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
