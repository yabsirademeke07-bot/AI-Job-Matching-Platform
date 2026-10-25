# Notification System Integration Guide

## 1. Import NotificationsView in Your Dashboard

```javascript
// In your employer dashboard file (e.g., EmployerDashboard.jsx or DashboardLayout.jsx)
import NotificationsView from './NotificationsView';

// Add as a route or navigation option
<Route path="/employer/notifications" element={<NotificationsView />} />
```

## 2. Add Notification Bell to Header

```javascript
import { useEffect, useState } from 'react';

function HeaderNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employer/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <a href="/employer/notifications" className="relative">
      <span>🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
          {unreadCount}
        </span>
      )}
    </a>
  );
}
```

## 3. Trigger Notifications When Creating Applications/Jobs

### When Application Status Changes (in jobSeekerController.js or similar)

```javascript
// After application is created/updated
await sendNotification(
  employerId,
  'employer',
  'New Application Received',
  `${candidateName} applied for ${jobTitle}`,
  'new_applicant',
  `/employer/applications/${applicationId}`,
  'high'
);
```

### When Sending Message to Candidate

```javascript
await sendNotification(
  candidateId,
  'job_seeker',
  'Message from Employer',
  `${employerName} sent you a message`,
  'candidate_message',
  `/messages/${messageId}`,
  'normal'
);
```

### When Job is About to Expire

```javascript
// Triggered by scheduled job or cron task
await sendNotification(
  employerId,
  'employer',
  'Job Listing Expiring Soon',
  `Your "${jobTitle}" posting expires in 2 days`,
  'job_expiring',
  `/employer/jobs/${jobId}`,
  'high'
);
```

## 4. Admin Broadcasting

### Send to All Employers

```bash
# POST /api/admin/broadcast-notification
curl -X POST http://localhost:5000/api/admin/broadcast-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Maintenance Notice",
    "message": "Platform will be under maintenance tonight from 10 PM - 12 AM UTC",
    "link": "/employer/dashboard",
    "priority": "high"
  }'
```

## 5. Database Schema Requirements

The `notifications` table must exist with these columns:
- `id` (INT PRIMARY KEY AUTO_INCREMENT)
- `user_id` (INT, FOREIGN KEY)
- `type` (ENUM with 7 types)
- `title` (VARCHAR)
- `message` (TEXT)
- `action_url` (VARCHAR)
- `is_read` (BOOLEAN)
- `read_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### If table doesn't exist, run:
```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('new_applicant', 'candidate_message', 'ai_match_alert', 'job_expiring', 'company_verified', 'interview_reminder', 'system_announcement', 'application-status') DEFAULT 'application-status',
  title VARCHAR(200) NOT NULL,
  message TEXT,
  action_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
);
```

## 6. Test the System

### 1. Verify Backend is Running
```bash
curl http://localhost:5000/api/employer/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Mark Notification as Read
```bash
curl -X PATCH http://localhost:5000/api/employer/notifications/mark-read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notificationId": 1}'
```

### 3. Mark All as Read
```bash
curl -X PATCH http://localhost:5000/api/employer/notifications/mark-read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 7. Features Summary

✅ **7 Notification Types** with distinct visual badges
✅ **Real-time Refresh** - Auto-updates every 30 seconds
✅ **5 Filter Categories** - All, Unread, Applications, Messages, System
✅ **Admin Broadcasting** - Send system-wide announcements
✅ **Mark as Read** - Individual or bulk mark read
✅ **Mobile Responsive** - Works on all screen sizes
✅ **Accessibility** - Proper semantic HTML and ARIA labels

## 8. Role-Based Telegram Alerts

The reusable `TelegramConnectCard` is available in seeker, employer, and admin settings.
Linking uses an authenticated API to create a 10-minute, single-use token. Telegram
start payloads include the account ID and normalized role for routing, but the backend
only links a chat when the opaque token, account ID, and stored role all match. Do not
replace this with a link that trusts a user ID or role supplied by the browser.

Telegram message dispatch is centralized in `backend/services/telegramNotifier.js`.
Candidate and employer delivery requires a linked chat and explicit
`is_alerts_enabled` opt-in, in addition to the stored role and event preferences.
Employer application alerts and candidate application-status changes resolve the
recipient's chat from their user ID at dispatch time. If that recipient has no valid
linked chat, the event is sent to `TELEGRAM_ADMIN_CHAT_ID` with an admin-copy prefix.
If a linked user has disabled alerts or the event preference, delivery is skipped
rather than copied to the admin.
Settings are saved through `/api/telegram/preferences`; `POST /api/notifications/disconnect`
removes the chat link and disables alerts. Recommended-job alerts are off by default.
Delivery attempts are recorded in `notification_logs`, failures in
`notification_failure_logs`, and each outgoing message is claimed once in
`dispatched_events` before calling Telegram. Transient network and server errors use
up to three attempts; rate limits honor Telegram's `retry_after`.

Telegram bot credentials are read only by backend services and are never returned by
status/settings APIs. Messages contain summary metadata only; message previews,
candidate CV details, emails, and interview links are not sent. Employer and candidate
event buttons link only to their authenticated application routes. Public channel
broadcasts have exactly two candidate actions, and both open the website configured
by `APP_URL`; they never link to a Telegram bot or include management links. Admin management controls
are sent only to the configured Bot Owner private chat. When the backend serves the
frontend build, it serves the frontend `dist` assets and falls back to `index.html`
for client-side routes.
Admin alerts and unlinked-recipient fallback copies use only the verified Bot Owner's
private `TELEGRAM_ADMIN_CHAT_ID`; groups, public channels, `TELEGRAM_ADMIN_GROUP_ID`,
and generic chat ID fallbacks are not used for administrative alerts.

Telegram `/start` and `/admin` from the configured owner private chat send three direct
admin actions. Each button contains a random, hashed, single-use SSO token that expires
after five minutes; token exchange creates the regular authenticated admin session.
Set `TELEGRAM_SUPER_ADMIN_CHAT_ID` and `TELEGRAM_ADMIN_EMAIL` explicitly for deployments
that do not use the configured owner defaults. Telegram username alone is not accepted
as proof of admin identity. Admin routes and `/api/admin/*` endpoints are authorized
by the signed admin session and database-backed role, without a second PIN prompt.
`JWT_SECRET` must be a deployment-specific random value of at least 32 characters; the
server refuses to start without it.

Telegram notification buttons and public-channel website links use the same origin:
`APP_URL`, defaulting to `http://localhost:5173` in development. Set `APP_URL` to the
canonical live website origin in production; it must not contain a path, query, or
fragment. Telegram Mini App buttons also use this origin, so production deployments
must configure an externally accessible website URL.
Telegram applicant-review buttons use `/?tab=matrix&candidateId=...`; the app routes
that link through the authenticated employer workspace and only opens an application
present in that employer's database-backed application list. The `explore`, `admin`,
and `seeker` tabs are also mapped to their protected routes.

Application submissions persist the application and candidate in-app notification
in the same MySQL transaction. Telegram and configured status webhooks are external
services and are dispatched after the database commit; their delivery cannot be part
of a cross-system ACID transaction. Telegram sends are retried for transient failures,
and a failed send releases its idempotency claim so a later attempt is not blocked.

ATS percentages are calculated deterministically from database/CV evidence. The
application score uses skills (45%), experience (30%), title relevance (15%), and
education (10%). Optional Gemini evaluation contributes supplemental strengths and
gaps only; it does not replace the deterministic ATS score.

Public job announcements are posted to `TELEGRAM_CHANNEL` (falling back to
`TELEGRAM_PUBLIC_CHANNEL`, then `TELEGRAM_CHANNEL_ID`) when a job becomes publicly
available, including admin approval, approved publication, and scheduled-job
activation. The bot must be an administrator in that channel with permission to post.
Each announcement has exactly two website buttons, both built from `APP_URL`. A
private publication alert is also sent to `TELEGRAM_CHAT_ID`; per-job idempotency
keys prevent duplicate channel posts and private alerts. The bot validates requested
jobs against active, approved database listings and replies with job details and the
public application page. Application submission continues through the authenticated
candidate flow so the application is recorded against the candidate's account. Salary
and experience use only values present on the published job; missing values are
labeled negotiable rather than filled with assumed amounts or experience levels.

Supported event templates cover candidate application/status/interview/match/message
alerts, employer applicant/interview/message/job-status/deadline alerts, and admin
registration/moderation/report/daily-summary events. Daily admin statistics are sent
once after the configured hour (default 08:00 using
the database server's timezone); set `TELEGRAM_DAILY_STATS_HOUR` to an integer from
`0` to `23` to change it.

The existing user role values (`job_seeker`, `employer`, `admin`, and `super_admin`)
are retained for compatibility and normalized to candidate, employer, or admin for
Telegram linking. Telegram columns, preference fields, and notification logs are created at startup
when missing. The migration also creates idempotency tracking tables for high-match
job alerts and daily admin summaries.
