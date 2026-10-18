const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random names: nothing from the user's file name ever touches the disk path.
  filename: (req, file, cb) => {
    cb(null, crypto.randomBytes(16).toString('hex') + EXTENSIONS[file.mimetype]);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!EXTENSIONS[file.mimetype]) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

module.exports = { upload, UPLOAD_DIR };
