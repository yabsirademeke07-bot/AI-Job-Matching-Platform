const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs"); // 1. የፓስወርድ መመስጠሪያውን መሣሪያ ማምጣት
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ከ MySQL ጋር ግንኙነት መፍጠር
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("ከዳታቤዝ ጋር መገናኘት አልተቻለም! ❌", err);
  } else {
    console.log("ከ XAMPP ማከማቻ (MySQL Database) ጋር በትክክል ተገናኝተናል! 🔌🎉");
  }
});

// ==========================================
// 2. አዲሱ የምዝገባ መስመር (User Registration Route)
// ==========================================
app.post("/api/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  // ሀ. ሁሉም መረጃዎች መሞላታቸውን ማረጋገጥ
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "እባክዎ ሁሉንም ሳጥኖች ያሟሉ!" });
  }

  try {
    // ለ. የይለፍ ቃሉን (Password) በምስጢር መቆለፍ (Hashing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ሐ. መረጃውን ወደ users ሰንጠረዥ የሚያስገባ የ SQL ትዕዛዝ
    const query =
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

    db.query(query, [name, email, hashedPassword, role], (err, result) => {
      if (err) {
        // ኢሜይሉ ከዚህ በፊት የተመዘገበ ከሆነ ስህተት ያሳያል
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "ይህ ኢሜይል ቀድሞ ተመዝግቧል!" });
        }
        console.error("የዳታቤዝ ስህተት አጋጥሟል! 🚨", err);
        return res.status(500).json({ error: err.message });
      }

      // መረጃው በትክክል ከገባ ለተጠቃሚው የደስታ መልስ መላክ
      res.status(201).json({ message: "ተጠቃሚው በስኬት ተመዝግቧል! 🎉" });
    });
  } catch (error) {
    res.status(500).json({ message: "የሰርቨር ስህተት አጋጥሟል!" });
  }
});

// መደበኛ የሰርቨር መክፈቻ ገጽ
app.get("/", (req, res) => {
  res.send("የእኛ የ AI Job Matching ሰርቨር እየሠራ ነው! 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ሰርቨሩ በፖርት ${PORT} ላይ ሥራ ጀምሯል! 🎉`);
});
