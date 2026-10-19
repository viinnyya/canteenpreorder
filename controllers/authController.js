const bcrypt = require('bcrypt');
const User = require('../models/user');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v) => (typeof v === 'string' ? v : '');

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'stall') return '/stall';
  return '/student';
}

const LOGIN_NOTICES = {
  registered: 'Registration received. An administrator must approve your account before you can log in.',
  signedout: 'You were signed out because your account is no longer active.',
  password: 'Password changed. Please log in again.'
};

function showLogin(req, res) {
  res.render('login', { errors: [], values: {}, notice: LOGIN_NOTICES[req.query.notice] || null });
}

function showRegister(req, res) {
  res.render('register', { errors: [], values: {} });
}

function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = [];
  const domain = (process.env.ALLOWED_STUDENT_DOMAIN || 'my.cspc.edu.ph').toLowerCase();

  if (name.length < 2 || name.length > 60) {
    errors.push('Name must be between 2 and 60 characters.');
  }

  if (!EMAIL_RE.test(email)) {
    errors.push('Enter a valid email address.');
  } else if (!email.endsWith('@' + domain)) {
    errors.push('Students must register with a @' + domain + ' email address.');
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  } else if (password.length > 72) {
    errors.push('Password must be at most 72 characters.');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  return errors;
}

// Replace the session id after login to prevent session fixation.
function startSession(req, res, next, user) {
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    res.redirect(homeFor(user.role));
  });
}

async function register(req, res, next) {
  try {
    const name = str(req.body.name).trim();
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);
    const confirmPassword = str(req.body.confirmPassword);

    const errors = validateRegistration({ name, email, password, confirmPassword });

    if (errors.length === 0 && User.findByEmail(email)) {
      errors.push('An account with that email already exists.');
    }

    if (errors.length > 0) {
      return res.status(400).render('register', { errors, values: { name, email } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Self-registration always creates a student. Stall and admin roles can never be chosen here.
    // New students wait for an admin to approve them, so they are not logged in yet.
    User.create({ name, email, passwordHash, role: 'student', status: 'pending' });

    res.redirect('/login?notice=registered');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);

    const errors = [];
    if (!email) errors.push('Email is required.');
    if (!password) errors.push('Password is required.');
    if (errors.length > 0) {
      return res.status(400).render('login', { errors, values: { email } });
    }

    const user = User.findByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!valid) {
      return res
        .status(401)
        .render('login', { errors: ['Invalid email or password.'], values: { email } });
    }

    if (user.status !== 'approved') {
      const reasons = {
        pending: 'Your registration is still waiting for admin approval.',
        rejected: 'Your registration was not approved. Please contact the canteen administrators.',
        disabled: 'This account has been disabled. Please contact the canteen administrators.'
      };
      return res
        .status(403)
        .render('login', { errors: [reasons[user.status] || 'This account cannot log in.'], values: { email } });
    }

    startSession(req, res, next, user);
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}

module.exports = { homeFor, showLogin, showRegister, register, login, logout };
