/**
 * 簡易 (Simple) AI Skill Matching Utility
 * @param {Array} seekerSkills - የስራ ፈላጊው ስኪሎች (e.g. ['React', 'Node.js', 'Tailwind'])
 * @param {Array} requiredSkills - ስራው የሚጠይቃቸው ስኪሎች (e.g. ['React', 'TypeScript', 'Node.js'])
 * @returns {number} Match Percentage (0 - 100)
 */
export function calculateMatchScore(seekerSkills = [], requiredSkills = []) {
    if (!requiredSkills.length) return 70; // Default estimate
    if (!seekerSkills.length) return 30;

    const matched = seekerSkills.filter(skill => 
        requiredSkills.some(req => req.toLowerCase() === skill.toLowerCase())
    );

    const matchPercentage = Math.round((matched.length / requiredSkills.length) * 100);
    return Math.min(Math.max(matchPercentage, 40), 98); // Keep between 40% - 98%
}