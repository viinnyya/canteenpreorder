const bcrypt = require('bcrypt');
const Stall = require('../models/stall');
const User = require('../models/user');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v) => (typeof v === 'string' ? v : '');

function validate({ name, description, email, password }) {
  const errors = [];
  if (name.length < 2 || name.length > 40) errors.push('Stall name must be 2 to 40 characters.');
  if (description.length > 120) errors.push('Description must be 120 characters or fewer.');
  if (!EMAIL_RE.test(email)) errors.push('Enter a valid login email for the stall.');
  if (password.length < 8) errors.push('Password must be at least 8 characters.');
  else if (password.length > 72) errors.push('Password must be at most 72 characters.');
  return errors;
}

function renderPage(res, { status = 200, errors = [], values = {}, notice = null } = {}) {
  res.status(status).render('admin/stalls', {
    stalls: Stall.allWithAccounts(),
    errors,
    values,
    notice
  });
}

function showStalls(req, res) {
  renderPage(res, { notice: req.query.notice === 'created' ? 'Stall account created.' : null });
}

async function createStall(req, res, next) {
  try {
    const name = str(req.body.name).trim();
    const description = str(req.body.description).trim();
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);

    const errors = validate({ name, description, email, password });
    if (errors.length === 0 && User.findByEmail(email)) errors.push('That email is already used by another account.');
    if (errors.length === 0 && Stall.findByName(name)) errors.push('A stall with that name already exists.');

    if (errors.length > 0) {
      return renderPage(res, { status: 400, errors, values: { name, description, email } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    Stall.createWithAccount({ name, description, email, passwordHash });
    res.redirect('/admin/stalls?notice=created');
  } catch (err) {
    next(err);
  }
}

const STUDENT_NOTICES = {
  approved: 'Student approved. They can log in now.',
  rejected: 'Student rejected. They can no longer log in.'
};

function showStudents(req, res) {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  res.render('admin/students', {
    status,
    students: User.listStudentsByStatus(status),
    counts: User.studentCounts(),
    notice: STUDENT_NOTICES[req.query.notice] || null
  });
}

function setStudentStatus(status) {
  return (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || User.setStudentStatus(id, status) === 0) {
      return res.status(404).render('errors/404');
    }
    res.redirect('/admin/students?status=' + (status === 'approved' ? 'approved' : 'rejected') + '&notice=' + status);
  };
}

module.exports = {
  showStalls,
  createStall,
  showStudents,
  approveStudent: setStudentStatus('approved'),
  rejectStudent: setStudentStatus('rejected')
};
