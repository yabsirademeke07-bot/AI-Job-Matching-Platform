import json
import numpy as np
import mysql.connector
from sentence_transformers import SentenceTransformer

# 1. Load Pre-trained Lightweight Vector Model
# 'all-MiniLM-L6-v2' ፈጣን እና ለቃላት/ፅሁፎች Semantic Similarity በጣም ተስማሚ ነው
model = SentenceTransformer('all-MiniLM-L6-v2')

# 2. MySQL Database Connection Config
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'job_matching'
}

def get_cosine_similarity(text1, text2):
    """ሁለት ፅሁፎችን ወደ Vector ቀይሮ Cosine Similarity (0-100%) ያሰላል"""
    if not text1 or not text2:
        return 0.0
    embeddings = model.encode([text1, text2])
    # Cosine Similarity Formula
    sim = np.dot(embeddings[0], embeddings[1]) / (np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1]))
    return float(max(0, sim) * 100)

def calculate_skills_score(candidate_skills, required_skills):
    """የ Skills Overlap Percent የሚያሰላ"""
    if not required_skills or not candidate_skills:
        return 0.0
    
    cand_set = set(s.lower().strip() for s in candidate_skills)
    req_set = set(s.lower().strip() for s in required_skills)
    
    matched = cand_set.intersection(req_set)
    score = (len(matched) / len(req_set)) * 100
    return float(score)

def calculate_experience_score(candidate_exp, req_min_exp):
    """የልምድ ዘመን ነጥብ የሚያሰላ"""
    if candidate_exp >= req_min_exp:
        return 100.0
    elif candidate_exp > 0:
        return float((candidate_exp / req_min_exp) * 100)
    return 0.0

def process_application_match(application_id):
    """አንድን Application መዝዞ በማስላት DB ላይ Update የሚያደርግ ዋና function"""
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)

    # 1. Fetch Application, Job, and Candidate Profile Data from Database
    # 1. Fetch Application, Job, and Candidate Profile Data from Database
   # 1. Fetch Application, Job, and Candidate Profile Data from Database
    query = """
    SELECT 
        a.id as app_id,
        j.description as job_desc, 
        j.required_skills as job_skills, 
        0 as job_min_exp, 
        j.location as job_loc,
        p.skills as candidate_skills, 
        p.experience_level as candidate_exp_str,
        p.location as candidate_loc, 
        p.raw_cv_text
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN job_seeker_profiles p ON a.job_seeker_id = p.user_id
    WHERE a.id = %s
    """
    cursor.execute(query, (application_id,))
    data = cursor.fetchone()

    if not data:
        print("❌ Application record not found!")
        conn.close()
        return

    # JSON Data Parsing
    c_skills = json.loads(data['candidate_skills']) if data['candidate_skills'] else []
    
    # job_skills በ Schemaህ መሠረት TEXT ወይም JSON ሊሆን ስለሚችል
    try:
        j_skills = json.loads(data['job_skills']) if data['job_skills'] else []
    except (json.JSONDecodeError, TypeError):
        j_skills = [s.strip() for s in data['job_skills'].split(',')] if data['job_skills'] else []

    # 2. Individual Matching Component Calculations
    # A. Skills Score
    skills_score = calculate_skills_score(c_skills, j_skills)

    # B. Vector Semantic Score (Job Description vs Candidate CV Text)
    vector_score = get_cosine_similarity(data['job_desc'], data['raw_cv_text'])

    # C. Experience Score (Simple parser mock - e.g., '3 years' -> 3)
    cand_exp = 3 # ከ profile or parsed JSON የሚወሰድ
    exp_score = calculate_experience_score(cand_exp, data['job_min_exp'] or 0)

    # D. Location Score
    loc_score = 100.0 if (data['job_loc'] and data['candidate_loc'] and 
                         data['job_loc'].lower() == data['candidate_loc'].lower()) else 50.0

    # 3. Final Weighted Overall AI Match Score Calculation
    # Skills (40%), CV Vector Text (30%), Experience (20%), Location (10%)
    overall_ai_score = (skills_score * 0.40) + (vector_score * 0.30) + (exp_score * 0.20) + (loc_score * 0.10)

    # 4. Save/Update Analysis Back to MySQL 'applications' Table
    update_query = """
UPDATE applications 
SET skills_match_score = %s,
    semantic_match_score = %s,
    experience_match_score = %s,
    location_match_score = %s,
    ai_match_score = %s
WHERE id = %s
"""
    summary = f"Match Breakdown: Skills ({skills_score:.1f}%), Semantic Text ({vector_score:.1f}%), Exp ({exp_score:.1f}%)"
    
    cursor.execute(update_query, (
        round(skills_score, 2),
        round(exp_score, 2),
        round(loc_score, 2),
        round(overall_ai_score, 2),
        summary,
        application_id
    ))

    conn.commit()
    print(f"✅ Application ID {application_id} Match Score Updated: {overall_ai_score:.2f}%")
    
    cursor.close()
    conn.close()

# Test Run Example
if __name__ == "__main__":
    # የ Application ID 1 ን ነጥብ ለማስላት
    process_application_match(application_id=1)