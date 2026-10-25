const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadAndAnalyze, validateAndParse, getAnalysis, syncProfile, getCurrentCv } = require('../controllers/cvController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
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

function selectUploadedCv(req, res, next) {
  const cvFile = req.files?.cv?.[0];
  const fileField = req.files?.file?.[0];
  req.file = cvFile || fileField;
  console.log('Upload received:', {
    file: req.file ? {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    } : null,
    files: Object.keys(req.files || {}),
    bodyFields: Object.keys(req.body || {}),
  });
  if (cvFile && fileField) {
    return res.status(400).json({ success: false, message: 'Upload one CV using either the cv or file field.' });
  }
  next();
}

const acceptCvFileFields = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.use(authMiddleware);
router.post('/upload', acceptCvFileFields, selectUploadedCv, uploadAndAnalyze);
router.post('/upload-and-analyze', acceptCvFileFields, selectUploadedCv, uploadAndAnalyze);
router.post('/analyze', acceptCvFileFields, selectUploadedCv, uploadAndAnalyze);
router.post('/validate-and-parse', acceptCvFileFields, selectUploadedCv, validateAndParse);
router.get('/current', getCurrentCv);
router.get('/:id/analysis', getAnalysis);
router.post('/:id/sync-profile', syncProfile);

module.exports = router;
