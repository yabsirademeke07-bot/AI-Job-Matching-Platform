const db = require('../connection');

const normalizeCompanyId = (value) => {
  const companyId = Number(value);
  return Number.isInteger(companyId) && companyId > 0 ? companyId : null;
};

const getCompanyProfile = async (companyId) => {
  const [rows] = await db.execute(
    'SELECT id, employer_id FROM company_profiles WHERE id = ? LIMIT 1',
    [companyId]
  );
  return rows[0] || null;
};

const getEmployerOwnedCompany = async (req, res) => {
  const companyId = normalizeCompanyId(req.params.companyId);
  if (!companyId) {
    res.status(400).json({ success: false, message: 'A valid company ID is required.' });
    return null;
  }
  const company = await getCompanyProfile(companyId);
  if (!company) {
    res.status(404).json({ success: false, message: 'Company profile not found.' });
    return null;
  }
  if (Number(company.employer_id) !== Number(req.user.id)) {
    res.status(403).json({ success: false, message: 'You can only manage feedback for your own company.' });
    return null;
  }
  return company;
};

const getReviews = async (companyId) => {
  const [reviews] = await db.execute(
    `SELECT r.id, r.title, r.narrative, r.role_title,
            r.work_mode, r.interview_rating, r.culture_rating, r.communication_rating,
            r.pros, r.cons, r.recommends, r.employer_response, r.employer_responded_at,
            r.created_at, IF(r.is_anonymous, NULL, u.full_name) AS author_name
     FROM company_reviews r
     JOIN users u ON u.id = r.candidate_id
     WHERE r.company_profile_id = ?
     ORDER BY r.created_at DESC`,
    [companyId]
  );
  return reviews.map((review) => ({
    ...review,
    verified_applicant: true,
    overall_rating: Number(((Number(review.interview_rating) + Number(review.culture_rating) + Number(review.communication_rating)) / 3).toFixed(1)),
    recommends: Boolean(review.recommends),
  }));
};

const getQuestions = async (companyId) => {
  const [questions] = await db.execute(
    `SELECT q.id, q.asker_id, q.question, q.answer, q.answered_at, q.created_at,
            asker.full_name AS asker_name, respondent.full_name AS respondent_name
     FROM company_questions q
     JOIN users asker ON asker.id = q.asker_id
     LEFT JOIN users respondent ON respondent.id = q.answered_by
     WHERE q.company_profile_id = ?
     ORDER BY (q.answer IS NULL) DESC, q.created_at DESC`,
    [companyId]
  );
  return questions;
};

exports.getReputation = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.params.companyId);
    if (!companyId) return res.status(400).json({ success: false, message: 'A valid company ID is required.' });
    const company = await getCompanyProfile(companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company profile not found.' });
    const [[aggregate]] = await db.execute(
      `SELECT COUNT(*) AS review_count,
              AVG((interview_rating + culture_rating + communication_rating) / 3) AS overall_rating,
              AVG(interview_rating) AS interview_rating,
              AVG(culture_rating) AS culture_rating,
              AVG(communication_rating) AS communication_rating,
              AVG(recommends = TRUE) AS recommendation_rate
       FROM company_reviews WHERE company_profile_id = ?`,
      [companyId]
    );
    const [reviews, questions] = await Promise.all([getReviews(companyId), getQuestions(companyId)]);
    return res.json({
      success: true,
      reputation: {
        reviewCount: Number(aggregate.review_count || 0),
        overallRating: aggregate.overall_rating == null ? null : Number(Number(aggregate.overall_rating).toFixed(1)),
        categories: {
          interviewProcess: aggregate.interview_rating == null ? null : Math.round(Number(aggregate.interview_rating) * 20),
          workCulture: aggregate.culture_rating == null ? null : Math.round(Number(aggregate.culture_rating) * 20),
          communicationSpeed: aggregate.communication_rating == null ? null : Math.round(Number(aggregate.communication_rating) * 20),
        },
        recommendationRate: aggregate.recommendation_rate == null ? null : Math.round(Number(aggregate.recommendation_rate) * 100),
        reviews,
        questions,
      },
    });
  } catch (error) {
    console.error('Company reputation fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load company reputation.' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.params.companyId);
    if (!companyId || !(await getCompanyProfile(companyId))) {
      return res.status(companyId ? 404 : 400).json({ success: false, message: 'Company profile not found.' });
    }
    return res.json({ success: true, reviews: await getReviews(companyId) });
  } catch (error) {
    console.error('Company reviews fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load company reviews.' });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.params.companyId);
    const company = companyId ? await getCompanyProfile(companyId) : null;
    if (!company) return res.status(companyId ? 404 : 400).json({ success: false, message: 'Company profile not found.' });
    const body = req.body || {};
    let applicationId = Number(body.application_id || body.applicationId || 0);
    const ratings = [
      Number(body.interview_rating ?? body.interviewRating ?? body.management_rating),
      Number(body.culture_rating ?? body.cultureRating),
      Number(body.communication_rating ?? body.communicationRating ?? body.compensation_rating),
    ];
    const title = String(body.title || 'Candidate interview experience').trim();
    const pros = String(body.pros || '').trim();
    const cons = String(body.cons || '').trim();
    const roleTitle = String(body.role_title || body.roleTitle || '').trim();
    const workMode = String(body.work_mode || body.workMode || '').trim();
    const narrative = String(body.narrative || [pros && `Pros: ${pros}`, cons && `Cons: ${cons}`].filter(Boolean).join('\n\n')).trim();
    if ((applicationId && (!Number.isInteger(applicationId) || applicationId < 1))
      || ratings.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)
      || title.length < 4 || title.length > 160 || narrative.length < 20 || narrative.length > 5000
      || pros.length > 1500 || cons.length > 1500 || roleTitle.length > 150 || workMode.length > 80
      || (body.recommends !== undefined && typeof body.recommends !== 'boolean')
      || (body.anonymous !== undefined && typeof body.anonymous !== 'boolean')) {
      return res.status(400).json({ success: false, message: 'Provide a valid application, three ratings, a review title, and a review of at least 20 characters.' });
    }
    if (!applicationId) {
      const [recentApplications] = await db.execute(
        `SELECT a.id FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.job_seeker_id = ? AND j.employer_id = ?
         ORDER BY a.applied_at DESC LIMIT 1`,
        [req.user.id, company.employer_id]
      );
      applicationId = Number(recentApplications[0]?.id || 0);
    }
    if (!applicationId) return res.status(403).json({ success: false, message: 'A verified application to this company is required to submit a review.' });
    const [applicationRows] = await db.execute(
      `SELECT a.id, j.title AS role_title, j.work_mode
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND a.job_seeker_id = ? AND j.employer_id = ? LIMIT 1`,
      [applicationId, req.user.id, company.employer_id]
    );
    if (!applicationRows.length) return res.status(403).json({ success: false, message: 'A verified application to this company is required to submit a review.' });
    const [existingRows] = await db.execute(
      'SELECT id FROM company_reviews WHERE company_profile_id = ? AND application_id = ? LIMIT 1',
      [companyId, applicationId]
    );
    if (existingRows.length) return res.status(409).json({ success: false, message: 'A review has already been submitted for this application.' });
    const [result] = await db.execute(
      `INSERT INTO company_reviews
       (company_profile_id, candidate_id, application_id, title, narrative, role_title, work_mode,
        interview_rating, culture_rating, communication_rating, pros, cons, recommends, is_anonymous)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, req.user.id, applicationId, title, narrative, roleTitle || applicationRows[0].role_title || null, workMode || applicationRows[0].work_mode || null,
        ratings[0], ratings[1], ratings[2], pros || null, cons || null, body.recommends === true ? 1 : 0, body.anonymous === true ? 1 : 0]
    );
    return res.status(201).json({ success: true, reviewId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A review has already been submitted for this application.' });
    }
    console.error('Company review submission failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit company review.' });
  }
};

exports.respondToReview = async (req, res) => {
  try {
    const company = await getEmployerOwnedCompany(req, res);
    if (!company) return undefined;
    const reviewId = Number(req.params.reviewId);
    const response = String(req.body?.response || '').trim();
    if (!Number.isInteger(reviewId) || reviewId < 1 || !response || response.length > 3000) {
      return res.status(400).json({ success: false, message: 'Enter an official response of up to 3,000 characters.' });
    }
    const [result] = await db.execute(
      'UPDATE company_reviews SET employer_response = ?, employer_responded_at = CURRENT_TIMESTAMP WHERE id = ? AND company_profile_id = ?',
      [response, reviewId, company.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Employer review response failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to post the official response.' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.params.companyId);
    if (!companyId || !(await getCompanyProfile(companyId))) {
      return res.status(companyId ? 404 : 400).json({ success: false, message: 'Company profile not found.' });
    }
    return res.json({ success: true, questions: await getQuestions(companyId) });
  } catch (error) {
    console.error('Company questions fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load company questions.' });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.params.companyId);
    if (!companyId || !(await getCompanyProfile(companyId))) {
      return res.status(companyId ? 404 : 400).json({ success: false, message: 'Company profile not found.' });
    }
    const question = String(req.body?.question || '').trim();
    if (question.length < 10 || question.length > 1000) {
      return res.status(400).json({ success: false, message: 'Questions must be between 10 and 1,000 characters.' });
    }
    const [result] = await db.execute(
      'INSERT INTO company_questions (company_profile_id, asker_id, question) VALUES (?, ?, ?)',
      [companyId, req.user.id, question]
    );
    return res.status(201).json({ success: true, questionId: result.insertId });
  } catch (error) {
    console.error('Company question submission failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit the company question.' });
  }
};

exports.answerQuestion = async (req, res) => {
  try {
    const company = await getEmployerOwnedCompany(req, res);
    if (!company) return undefined;
    const questionId = Number(req.params.questionId);
    const answer = String(req.body?.answer || '').trim();
    if (!Number.isInteger(questionId) || questionId < 1 || !answer || answer.length > 3000) {
      return res.status(400).json({ success: false, message: 'Enter an answer of up to 3,000 characters.' });
    }
    const [result] = await db.execute(
      `UPDATE company_questions
       SET answer = ?, answered_by = ?, answered_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_profile_id = ?`,
      [answer, req.user.id, questionId, company.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Question not found.' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Employer question answer failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to publish the official answer.' });
  }
};
