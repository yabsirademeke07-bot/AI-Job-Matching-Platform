import api from "./api";

export const getCandidateProfile = async () => {
  const [{ data: profileData }, { data: cvData }] = await Promise.all([
    api.get("/seeker/profile/full"),
    api.get("/cv/current"),
  ]);
  const profile = profileData?.profile || {};
  const cv = cvData?.cv || null;
  return {
    id: profile.user_id || profile.id,
    name: profile.full_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || profile.city || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    cvUploaded: Boolean(cv),
    cvFileName: cv?.fileName || "",
  };
};

export const uploadCandidateCV = async (_candidateId, file) => {
  const formData = new FormData();
  formData.append("cv", file);
  const { data } = await api.post("/seeker/upload-cv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateCandidateProfileManual = async (_candidateId, profileData) => {
  const { data } = await api.put("/seeker/profile", {
    fullName: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    headline: profileData.headline,
    bio: profileData.bio,
  });
  return data;
};
