// Express Controller for Quick Apply
const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const applicantId = req.user.id; // ከ authMiddleware የተገኘ የ User ID

    // 1. File Upload መደረጉን ማረጋገጥ
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'እባክዎ CV ወይም Resume Upload ያድርጉ!',
      });
    }

    const cvUrl = req.file.path; // ወይም Multer/Cloudinary የሰጠው File Path

    // 2. Database ላይ Application Save ማድረግ (በአንተ ORM/Mongoose ሞዴል መሠረት)
    /* 
    const newApplication = await Application.create({
      job: jobId,
      applicant: applicantId,
      cvPath: cvUrl,
      status: 'pending'
    });
    */

    return res.status(201).json({
      success: true,
      message: 'ማመልከቻዎ እና CVዎ በስኬት ተልኳል!',
      data: {
        jobId,
        applicantId,
        cvUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'ማመልከቻውን በመላክ ላይ ስህተት ተፈጥሯል',
      error: error.message,
    });
  }
};

module.exports = { applyForJob };