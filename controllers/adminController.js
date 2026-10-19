const bcrypt = require('bcrypt');
const Stall = require('../models/stall');
const User = require('../models/user');
const MenuItem = require('../models/menuItem');
const menuController = require('./menuController');

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

const STALL_NOTICES = {
  created: 'Stall account created.',
  removed: 'Stall removed. Its login is disabled and students no longer see it. Past sales are kept.',
  restored: 'Stall restored. Its login works again.'
};

function showStalls(req, res) {
  let notice = STALL_NOTICES[req.query.notice] || null;
  if (req.query.notice === 'imported') {
    notice = 'Import finished: ' + (parseInt(req.query.added, 10) || 0) + ' added, ' + (parseInt(req.query.updated, 10) || 0) + ' updated.';
  }
  renderPage(res, { notice });
}

function loadStall(req, res) {
  const id = Number(req.params.id);
  const stall = Number.isInteger(id) && id > 0 ? Stall.findById(id) : null;
  if (!stall) res.status(404).render('errors/404');
  return stall;
}

function removeStall(req, res) {
  const stall = loadStall(req, res);
  if (!stall) return;
  if (!stall.active) return res.redirect('/admin/stalls');
  const open = Stall.countActiveOrders(stall.id);
  if (open > 0) {
    return renderPage(res, {
      status: 400,
      errors: [stall.name + ' still has ' + open + ' unfinished order' + (open === 1 ? '' : 's') + '. Let the stall finish or reject them first.']
    });
  }
  Stall.remove(stall.id);
  res.redirect('/admin/stalls?notice=removed');
}

function restoreStall(req, res) {
  const stall = loadStall(req, res);
  if (!stall) return;
  Stall.restore(stall.id);
  res.redirect('/admin/stalls?notice=restored');
}

function exportStallMenu(req, res) {
  const stall = loadStall(req, res);
  if (!stall) return;
  menuController.sendMenuCsv(res, stall);
}

function importStallMenu(req, res) {
  const stall = loadStall(req, res);
  if (!stall) return;
  const { errors, result } = menuController.runImport(req, stall);
  if (errors.length > 0) {
    return renderPage(res, { status: 400, errors: ['Import for ' + stall.name + ' failed, nothing was changed.'].concat(errors) });
  }
  res.redirect('/admin/stalls?notice=imported&added=' + result.added + '&updated=' + result.updated);
}

async function createStall(req, res, next) {
  try {
    const name = str(req.body.name).trim();
    const description = str(req.body.description).trim();
    const email = str(req.body.email).trim().toLowerCase();
    const password = str(req.body.password);

    const errors = validate({ name, description, email, password });
    if (errors.length === 0 && User.findByEmail(email)) errors.push('That email is already used by another account.');
    if (errors.length === 0) {
      const sameName = Stall.findByName(name);
      if (sameName && !sameName.active) errors.push('A removed stall already uses that name. Restore it from the list instead.');
      else if (sameName) errors.push('A stall with that name already exists.');
    }

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
  removeStall,
  restoreStall,
  exportStallMenu,
  importStallMenu,
  showStudents,
  approveStudent: setStudentStatus('approved'),
  rejectStudent: setStudentStatus('rejected')
};
