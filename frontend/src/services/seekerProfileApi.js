import api from "./api";
import { notifyProfileUpdated } from "../utils/profileUpdateEvent";

export const emptyProfile = {
  id: "",
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  bio: "",
  education: [],
  skills: [],
  experience: [],
  languages: [],
  certifications: [],
};

export async function getProfile() {
  const { data } = await api.get("/seeker/profile/full");
  if (!data?.profile) return data;
  const profile = data.profile;
  return {
    ...profile,
    id: profile.id || profile.user_id,
    name: profile.full_name || profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || profile.city || "",
    education: data.education || [],
    skills: data.skills || [],
    experience: data.experience || [],
    languages: data.languages || [],
    certifications: data.certifications || [],
  };
}

export async function updateProfile(profile) {
  const { data } = await api.put("/seeker/profile", profile);
  notifyProfileUpdated();
  return data?.profile || data?.data || data;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.post("/seeker/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

const updateCollection = async (key, updater) => {
  const profile = await getProfile();
  const currentItems = Array.isArray(profile[key]) ? profile[key] : [];
  const nextItems = updater(currentItems);
  const updated = await updateProfile({ ...profile, [key]: nextItems });
  return { profile: updated, items: nextItems };
};

const addItem = async (key, item) => {
  const newItem = { ...item, id: item.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}` };
  await updateCollection(key, (items) => [...items, newItem]);
  return newItem;
};

const updateItem = async (key, id, changes) => {
  const { items } = await updateCollection(key, (current) => current.map((item) => String(item.id) === String(id) ? { ...item, ...changes, id: item.id } : item));
  return items.find((item) => String(item.id) === String(id));
};

const deleteItem = async (key, id) => {
  await updateCollection(key, (items) => items.filter((item) => String(item.id) !== String(id)));
  return { id };
};

export const addExperience = (data) => addItem("experience", data);
export const addEducation = (data) => addItem("education", data);
export const addCertification = (data) => addItem("certifications", data);

export async function updatePersonalInfo(data) {
  const { data: response } = await api.put("/seeker/profile/personal", data);
  notifyProfileUpdated();
  return response;
}

export async function updateSkills(skills) {
  const { data } = await api.put("/seeker/profile/skills", { skills });
  notifyProfileUpdated();
  return data;
}

export const updateEducation = (id, data) => updateItem("education", id, data);
export const deleteEducation = (id) => deleteItem("education", id);
export const updateExperience = (id, data) => updateItem("experience", id, data);
export const deleteExperience = (id) => deleteItem("experience", id);
export const updateCertification = (id, data) => updateItem("certifications", id, data);
export const deleteCertification = (id) => deleteItem("certifications", id);
export const updateFullProfile = updateProfile;
