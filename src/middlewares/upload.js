const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create folder for investor documents if needed
    if (req.params.investorId) {
      const investorDir = path.join(uploadDir, 'investors', req.params.investorId);
      if (!fs.existsSync(investorDir)) {
        fs.mkdirSync(investorDir, { recursive: true });
      }
      cb(null, investorDir);
    } else if (req.params.transactionId) {
      const transactionDir = path.join(uploadDir, 'transactions', req.params.transactionId);
      if (!fs.existsSync(transactionDir)) {
        fs.mkdirSync(transactionDir, { recursive: true });
      }
      cb(null, transactionDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
  
  // Check extension
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime type
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, PDF, Word, and Excel files are allowed'));
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

module.exports = upload; 