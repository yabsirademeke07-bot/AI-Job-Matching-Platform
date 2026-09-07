const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadAndAnalyze, getAnalysis, syncProfile } = require('../controllers/cvController');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'cvs'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp'];
    callback(null, allowed.includes(file.mimetype) && ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.use(authMiddleware);
router.post('/upload-and-analyze', upload.single('cv'), uploadAndAnalyze);
router.post('/analyze', upload.single('cv'), uploadAndAnalyze);
router.get('/:id/analysis', getAnalysis);
router.post('/:id/sync-profile', syncProfile);

module.exports = router;
