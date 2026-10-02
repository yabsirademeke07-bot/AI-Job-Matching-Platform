const db = require('../config/db');

const defaultAboutContent = {
  id: null,
  title: 'About AI-Powered Job Matching System',
  description: 'An intelligent job matching platform that connects job seekers with relevant opportunities by analyzing their skills, experience, education, and career preferences.',
  mission: 'Our mission is to make job discovery and recruitment faster, smarter, and more personalized through artificial intelligence.',
  vision: 'Our vision is to create an intelligent employment ecosystem where employers find the right talent and people find meaningful work.',
  updated_at: null,
};

async function getAboutContent() {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, description, mission, vision, updated_at
       FROM about_content
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`
    );

    return rows[0] || defaultAboutContent;
  } catch (error) {
    console.warn('About content table unavailable; using default content:', error.message);
    return defaultAboutContent;
  }
}

module.exports = { getAboutContent };
