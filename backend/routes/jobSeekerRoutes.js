const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProfile, updateProfile, listCollection, addCollectionItem,
  deleteCollectionItem, getApplications, uploadCv
} = require('../controllers/jobSeekerController');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'cvs'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    callback(null, allowedTypes.includes(file.mimetype));
  },
});

router.use(authMiddleware);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/applications', getApplications);
router.post('/upload-cv', upload.single('cv'), uploadCv);
router.get('/:collection', listCollection);
router.post('/:collection', addCollectionItem);
router.delete('/:collection/:id', deleteCollectionItem);

module.exports = router;
