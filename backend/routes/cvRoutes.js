const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadAndAnalyze, validateAndParse, getAnalysis, syncProfile } = require('../controllers/cvController');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'cvs'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.odt', '.png', '.jpg', '.jpeg', '.webp'];
    if (allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      return callback(null, true);
    }

    const error = new Error('Unsupported file type. Please upload a PDF, DOCX, DOC, TXT, RTF, ODT, PNG, JPG, or WEBP CV file.');
    error.status = 400;
    callback(error);
  },
});

router.use(authMiddleware);
router.post('/upload-and-analyze', upload.single('cv'), uploadAndAnalyze);
router.post('/analyze', upload.single('cv'), uploadAndAnalyze);
router.post('/validate-and-parse', upload.single('cv'), validateAndParse);
router.get('/:id/analysis', getAnalysis);
router.post('/:id/sync-profile', syncProfile);

module.exports = router;
