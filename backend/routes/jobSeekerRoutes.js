const express = require('express');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProfile, updateProfile, saveProfile, listCollection, addCollectionItem,
  deleteCollectionItem, getApplications, getApplicationDetails, withdrawApplication,
  saveApplicationNote, getApplicationInterview, requestInterviewReschedule,
  uploadCv, updatePersonalInfo, updateSkills, uploadProfileAvatar, removeProfileAvatar
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
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype));
  },
});

router.use(authMiddleware);
router.get('/profile', getProfile);
router.get('/profile/full', getProfile);
router.put('/profile', updateProfile);
router.post('/profile', updateProfile);
router.post('/profile/save', saveProfile);
router.put('/profile/personal', updatePersonalInfo);
router.post('/profile/avatar', avatarUpload.single('avatar'), uploadProfileAvatar);
router.delete('/profile/avatar', removeProfileAvatar);
router.put('/profile/skills', updateSkills);
router.get('/applications', getApplications);
router.get('/applications/:applicationId', getApplicationDetails);
router.post('/applications/:applicationId/withdraw', withdrawApplication);
router.post('/applications/:applicationId/notes', saveApplicationNote);
router.get('/applications/:applicationId/interview', getApplicationInterview);
router.post('/applications/:applicationId/interview/reschedule', requestInterviewReschedule);
router.post('/upload-cv', upload.single('cv'), uploadCv);
router.get('/:collection', listCollection);
router.post('/:collection', addCollectionItem);
router.delete('/:collection/:id', deleteCollectionItem);

module.exports = router;
