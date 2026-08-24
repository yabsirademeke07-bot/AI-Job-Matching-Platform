const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  photo: { type: String },
  role: { 
    type: String, 
    enum: ['pending', 'job_seeker', 'employer'], 
    default: 'pending' 
  },
  isProfileComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);