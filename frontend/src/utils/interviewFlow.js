const APPLICATIONS_KEY = 'mockApplications';
const EMPLOYER_APPLICATIONS_KEY = 'employerApplications';
const INTERVIEWS_KEY = 'mockInterviews';
const NOTIFICATIONS_KEY = 'mockNotifications';

const read = (key, fallback = []) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export function getMockInterviews() { return read(INTERVIEWS_KEY); }

export function getMockApplications() {
  const applications = [...read(APPLICATIONS_KEY), ...read(EMPLOYER_APPLICATIONS_KEY)];
  return applications.filter((application, index, items) => items.findIndex((item) => String(item.id) === String(application.id)) === index);
}

export function getMockInterview(id) {
  return getMockInterviews().find((interview) => String(interview.id) === String(id)) || null;
}

export function getMockNotifications() { return read(NOTIFICATIONS_KEY); }

export function updateMockApplication(applicationId, changes) {
  let updated = null;
  [APPLICATIONS_KEY, EMPLOYER_APPLICATIONS_KEY].forEach((key) => {
    const applications = read(key);
    const next = applications.map((application) => {
      if (String(application.id) !== String(applicationId)) return application;
      updated = { ...application, ...changes };
      return updated;
    });
    if (next.some((application) => String(application.id) === String(applicationId))) write(key, next);
  });
  return updated;
}

export function scheduleMockInterview(application, details) {
  const interview = {
    id: `interview-${Date.now()}`,
    applicationId: application.id,
    jobTitle: application.jobTitle || application.title || application.role || 'Job interview',
    company: application.companyName || application.company || 'Company',
    status: 'Scheduled',
    date: details.date,
    time: details.time,
    type: details.type,
    location: details.type === 'In-person' ? details.location : '',
    meetingLink: details.type === 'Online' ? details.meetingLink : '',
    instructions: details.instructions,
  };
  write(INTERVIEWS_KEY, [...getMockInterviews().filter((item) => String(item.applicationId) !== String(application.id)), interview]);
  updateMockApplication(application.id, { status: 'Interview', applicationStatus: 'Interview', interviewId: interview.id, interview });
  const notifications = getMockNotifications().filter((item) => String(item.relatedApplicationId) !== String(application.id) || item.type !== 'interview');
  write(NOTIFICATIONS_KEY, [{
    id: `notification-${Date.now()}`,
    type: 'interview',
    title: 'Interview Invitation',
    message: `You have been invited to interview for ${interview.jobTitle} at ${interview.company}.`,
    relatedApplicationId: application.id,
    relatedInterviewId: interview.id,
    createdAt: 'Just now',
    isRead: false,
  }, ...notifications]);
  return interview;
}

export function getUpcomingMockInterview() {
  return getMockInterviews().find((interview) => interview.status === 'Scheduled') || null;
}

export function updateMockInterview(interviewId, changes) {
  const interviews = getMockInterviews();
  const next = interviews.map((interview) => String(interview.id) === String(interviewId) ? { ...interview, ...changes } : interview);
  write(INTERVIEWS_KEY, next);
  const interview = next.find((item) => String(item.id) === String(interviewId)) || null;
  if (interview && changes.status === 'Completed') updateMockApplication(interview.applicationId, { interview });
  if (interview && changes.status === 'Cancelled') updateMockApplication(interview.applicationId, { interview, applicationStatus: 'Interview' });
  return interview;
}

export function notifyMockApplication(application, status, details = {}) {
  const normalizedStatus = String(status || '').trim();
  const jobTitle = application?.jobTitle || application?.title || application?.role || 'this role';
  const companyName = application?.companyName || application?.company || 'the company';
  const interviewDate = details?.date ? new Date(`${details.date}T${details.time || '09:00'}`) : null;
  let title = 'Application Update';
  let message = `Your application for ${jobTitle} has been updated.`;

  if (normalizedStatus === 'Rejected') {
    title = 'Application Rejected';
    message = `Your application for ${jobTitle} has been Rejected.`;
  } else if (normalizedStatus === 'Hired') {
    title = 'Offer Accepted';
    message = `Congratulations! You have been marked as Hired at ${companyName}`;
  } else if (normalizedStatus === 'Interview') {
    title = 'Interview Invitation';
    const label = interviewDate && !Number.isNaN(interviewDate.getTime()) ? interviewDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : details?.date || 'the scheduled date';
    message = `Interview Invitation from ${companyName} for ${jobTitle} on ${label}`;
  } else if (normalizedStatus === 'Shortlisted') {
    title = 'Application Shortlisted';
    message = `Your application for ${jobTitle} has been Shortlisted!`;
  }

  const notification = {
    id: `notification-${Date.now()}`,
    type: normalizedStatus === 'Interview' ? 'interview' : 'application',
    title,
    message,
    relatedId: application?.id,
    relatedApplicationId: application?.id,
    relatedInterviewId: details?.interviewId || null,
    createdAt: 'Just now',
    isRead: false,
  };
  write(NOTIFICATIONS_KEY, [notification, ...getMockNotifications()]);
  window.dispatchEvent?.(new CustomEvent('job-matching:updated', { detail: { key: 'notifications' } }));
  return notification;
}

export function rescheduleMockInterview(interview, details) {
  const updated = { ...interview, date: details.date, time: details.time, type: details.type, location: details.type === 'In-person' ? details.location : '', meetingLink: details.type === 'Online' ? details.meetingLink : '', instructions: details.instructions, status: 'Scheduled' };
  updateMockInterview(interview.id, updated);
  const notification = { id: `notification-${Date.now()}`, type: 'interview', title: 'Interview Updated', message: 'Your interview schedule has been updated.', relatedApplicationId: interview.applicationId, relatedInterviewId: interview.id, createdAt: 'Just now', isRead: false };
  write(NOTIFICATIONS_KEY, [notification, ...getMockNotifications()]);
  return updated;
}