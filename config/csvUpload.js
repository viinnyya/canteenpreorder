// Accepts one small .csv file, kept in memory (never written to disk).
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/\.csv$/i.test(file.originalname || '')) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

// Turns upload problems into req.uploadError so the page can show a friendly message.
function uploadCsv(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') req.uploadError = 'The CSV file must be 100 KB or smaller.';
      else if (err.code === 'INVALID_TYPE') req.uploadError = 'Please upload a .csv file.';
      else req.uploadError = 'The file could not be uploaded. Please try again.';
    }
    next();
  });
}

module.exports = { uploadCsv };
