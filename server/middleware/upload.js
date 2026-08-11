const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
const docsDir = path.join(uploadsDir, 'documents');
const collateralDir = path.join(uploadsDir, 'collateral');

// Ensure directories exist
[uploadsDir, docsDir, collateralDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const field = (file.fieldname || '').toLowerCase();
    if (field.includes('collateral') || field.includes('photo')) {
      cb(null, collateralDir);
    } else {
      cb(null, docsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

module.exports = upload;
