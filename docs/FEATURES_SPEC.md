# ConnectDevs Backend — Feature Specifications

> API-side specs for each planned feature. Each spec includes: new endpoints, model changes, middleware, and implementation notes.
> Corresponds to frontend specs in `../ConnectDevs/docs/FEATURES_SPEC.md`.

---

## Tier 1 — Quick Wins (Frontend-only, no backend changes)

### FEAT-01: Protected Routes & Auth Guard
**Backend**: No changes needed. Existing `GET /profile/view` + `userAuth` middleware already returns 400 for unauthenticated users.

### FEAT-02: Custom 404 Page
**Backend**: No changes needed. Frontend-only feature.

---

## Tier 2 — Profile & Feed Enhancement

### FEAT-03: Tech Stack / Skills Tags

**Backend**: The User model already has a `skills: [String]` field and `validateEditProfileData` already allows `skills`. **No backend changes needed** — the field just isn't used by the current frontend.

**Verification**:
- `PATCH /profile/edit` with `{ skills: ["React", "Node.js"] }` should already work
- `GET /feed` already returns user data including skills
- `GET /user/connections` and `GET /user/requests/received` populate user data including skills

---

### FEAT-04: Swipe Card UI
**Backend**: No changes needed. Existing `POST /request/send/:status/:userId` and `GET /feed` already support this.

---

### FEAT-05: Skeleton Loaders
**Backend**: No changes needed. Frontend-only feature.

---

## Tier 3 — Communication

### FEAT-06: Real-time Chat (Socket.io)

**Goal**: Enable real-time messaging between connected users.

**New Dependencies**:
```bash
npm install socket.io
```

**New Model**: `src/models/message.js`
```
Message Schema:
- sender     (ObjectId, Ref: "User", Required)
- receiver   (ObjectId, Ref: "User", Required)
- text       (String, Required, maxLength: 2000)
- read       (Boolean, Default: false)
- createdAt  (Timestamp)
- updatedAt  (Timestamp)

Indexes:
- Compound on (sender, receiver)
- On createdAt for sorting
```

**New Route File**: `src/routes/chat.js`

| Method | Endpoint                   | Auth | Body / Query                 | Response                            |
|--------|---------------------------|------|------------------------------|-------------------------------------|
| GET    | `/chat/:userId`           | Yes  | `?page=1&limit=50`          | `{ data: [messages], hasMore }`     |
| POST   | `/chat/:userId`           | Yes  | `{ text }`                   | `{ data: message }`                |
| PATCH  | `/chat/:userId/read`      | Yes  | —                            | `{ message: "Messages marked read" }` |
| GET    | `/chat/unread/count`      | Yes  | —                            | `{ data: { total, byUser: {} } }`  |

**Socket.io Events** (add to `src/app.js`):

```
Server Events (emit):
- "receiveMessage"    → { message }          — sent to receiver
- "messageRead"       → { senderId }         — sent to sender when receiver reads
- "userOnline"        → { userId }           — broadcast to connections
- "userOffline"       → { userId }           — broadcast to connections
- "typing"            → { userId }           — sent to conversation partner

Client Events (listen):
- "sendMessage"       → { receiverId, text } — client sends a message
- "markRead"          → { senderId }         — client marks messages as read
- "typing"            → { receiverId }       — client is typing
- "stopTyping"        → { receiverId }       — client stopped typing
```

**New Files**:
- `src/models/message.js`
- `src/routes/chat.js`
- `src/socket/socketManager.js` — Socket.io setup, event handlers, online tracking

**Changes**:
- `src/app.js` — integrate Socket.io with HTTP server, mount chat routes

**Validation**:
- Users must be connected (status: 'accepted') to chat
- Message text max 2000 characters
- Rate limit: max 30 messages per minute per user

**Implementation Notes**:
- Use `http.createServer(app)` instead of `app.listen()` to share server with Socket.io
- Authenticate socket connections using the JWT cookie
- Track online users with a Map: `userId → socketId`
- Store messages in MongoDB, deliver via Socket.io in real time
- If receiver is offline, message is stored and delivered on next login

**Acceptance Criteria**:
- [ ] Messages persist in database
- [ ] Real-time delivery via Socket.io when both users online
- [ ] Typing indicator events work
- [ ] Unread count endpoint returns correct counts
- [ ] Only connected users can chat (verified server-side)
- [ ] Messages paginate correctly

---

### FEAT-07: Notifications System

**Goal**: Real-time notifications for connection events and messages.

**New Model**: `src/models/notification.js`
```
Notification Schema:
- userId     (ObjectId, Ref: "User", Required)  — notification recipient
- type       (String, Required, Enum: ['request_received', 'request_accepted', 'new_message'])
- fromUserId (ObjectId, Ref: "User", Required)  — who triggered it
- message    (String, Required)                  — display text
- read       (Boolean, Default: false)
- metadata   (Mixed)                             — extra data (requestId, messageId, etc.)
- createdAt  (Timestamp)
- updatedAt  (Timestamp)

Indexes:
- Compound on (userId, read)
- On createdAt for sorting
```

**New Route File**: `src/routes/notification.js`

| Method | Endpoint                     | Auth | Body / Query      | Response                              |
|--------|------------------------------|------|--------------------|---------------------------------------|
| GET    | `/notifications`             | Yes  | `?page=1&limit=20` | `{ data: [notifications], unread }`   |
| PATCH  | `/notifications/read`        | Yes  | `{ ids: [] }`      | `{ message: "Marked as read" }`       |
| PATCH  | `/notifications/read-all`    | Yes  | —                  | `{ message: "All marked as read" }`   |
| DELETE | `/notifications/:id`         | Yes  | —                  | `{ message: "Notification deleted" }` |

**Socket.io Event**:
- `"newNotification"` → `{ notification }` — pushed to userId in real time

**Trigger Points** (add notification creation to existing routes):
- `POST /request/send/interested/:userId` → create notification for toUser: "X wants to connect"
- `POST /request/review/accepted/:requestId` → create notification for fromUser: "X accepted your request"
- `POST /chat/:userId` → create notification for receiver: "X sent you a message"

**New Files**:
- `src/models/notification.js`
- `src/routes/notification.js`

**Changes**:
- `src/routes/request.js` — add notification creation on send/review
- `src/routes/chat.js` — add notification creation on new message
- `src/app.js` — mount notification routes

**Acceptance Criteria**:
- [ ] Notifications created automatically on relevant actions
- [ ] Pushed via Socket.io in real time
- [ ] Mark single / mark all as read works
- [ ] Paginated retrieval
- [ ] Unread count returned with list

---

## Tier 4 — Discovery & Integration

### FEAT-08: Search & Filter Developers

**Goal**: Enable filtered feed and connection search.

**Changes to existing routes**:

#### Updated: `GET /feed`
Add query parameter support:
```
Query Params:
- page       (Number, default: 1)
- limit      (Number, default: 10, max: 50)
- skills     (String, comma-separated — e.g., "React,Node.js")
- minAge     (Number)
- maxAge     (Number)
- gender     (String — 'male', 'female', 'other')
- search     (String — searches firstName and lastName)

Example: GET /feed?skills=React,Python&minAge=20&maxAge=35&search=john
```

**Implementation**:
```javascript
// Build MongoDB filter
const filter = { _id: { $nin: hideUserIds } };

if (skills) {
  filter.skills = { $in: skills.split(',') };
}
if (minAge || maxAge) {
  filter.age = {};
  if (minAge) filter.age.$gte = parseInt(minAge);
  if (maxAge) filter.age.$lte = parseInt(maxAge);
}
if (gender) {
  filter.gender = gender;
}
if (search) {
  const regex = new RegExp(search, 'i');
  filter.$or = [
    { firstName: regex },
    { lastName: regex }
  ];
}
```

#### New: `GET /user/connections/search`
```
Query Params:
- search  (String — searches firstName, lastName)

Response: { data: [filtered connections] }
```

**Changes**:
- `src/routes/user.js` — update feed query, add connection search endpoint

**Acceptance Criteria**:
- [ ] Feed filters by skills (any match)
- [ ] Feed filters by age range
- [ ] Feed filters by gender
- [ ] Feed text search on name (case-insensitive)
- [ ] Connections searchable by name
- [ ] Filters combinable (AND logic)
- [ ] Pagination still works with filters

---

### FEAT-09: GitHub Integration

**Goal**: Let users connect their GitHub account and display repos/profile data.

**New Dependencies**:
```bash
npm install axios   # For GitHub API calls
```

**Model Changes**: Add to User schema:
```javascript
github: {
  username:    String,
  accessToken: String,     // encrypted
  profileUrl:  String,
  avatarUrl:   String,
  connectedAt: Date
}
```

**New Route File**: `src/routes/github.js`

| Method | Endpoint                   | Auth | Body / Query           | Response                                 |
|--------|---------------------------|------|------------------------|------------------------------------------|
| GET    | `/github/auth`            | Yes  | —                      | Redirect to GitHub OAuth                 |
| GET    | `/github/callback`        | Yes  | `?code=...`            | Process OAuth, save token, redirect      |
| GET    | `/github/repos/:userId`   | Yes  | `?sort=stars&limit=6`  | `{ data: [repos] }`                     |
| GET    | `/github/profile/:userId` | Yes  | —                      | `{ data: { username, repos, languages } }` |
| DELETE | `/github/disconnect`      | Yes  | —                      | `{ message: "GitHub disconnected" }`     |

**Environment Variables** (add to `.env`):
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/github/callback
```

**OAuth Flow**:
1. Frontend redirects to `GET /github/auth`
2. Server redirects to `https://github.com/login/oauth/authorize?client_id=...&scope=read:user,repo`
3. GitHub redirects to `/github/callback?code=...`
4. Server exchanges code for access token
5. Server fetches GitHub user profile
6. Saves username + token to User model
7. Redirects back to frontend `/profile`

**New Files**:
- `src/routes/github.js`

**Changes**:
- `src/models/user.js` — add `github` subdocument to schema
- `src/app.js` — mount github routes
- `src/utilis/helper.js` — add `github` to allowed edit fields (or handle separately)

**Acceptance Criteria**:
- [ ] OAuth flow completes successfully
- [ ] GitHub username and repos stored/cached
- [ ] Repos endpoint returns formatted repo data
- [ ] Disconnect removes GitHub data from user
- [ ] Graceful error if GitHub API is rate-limited or down
- [ ] Access token stored securely (encrypted at rest)

---

## Tier 5 — Safety & Auth Flows

### FEAT-10: Dark/Light Theme Toggle
**Backend**: No changes needed. Frontend-only feature.

---

### FEAT-11: Block / Report User

**Goal**: Let users block or report profiles for safety.

**Model Changes**: Add to User schema:
```javascript
blockedUsers: [{ type: ObjectId, ref: "User" }]
```

**New Model**: `src/models/report.js`
```
Report Schema:
- reporterId  (ObjectId, Ref: "User", Required)
- reportedId  (ObjectId, Ref: "User", Required)
- reason      (String, Required, Enum: ['spam', 'harassment', 'inappropriate', 'fake', 'other'])
- description (String, maxLength: 500)
- status      (String, Default: 'pending', Enum: ['pending', 'reviewed', 'resolved'])
- createdAt   (Timestamp)
```

**New Endpoints** (add to `src/routes/user.js` or new `src/routes/safety.js`):

| Method | Endpoint                  | Auth | Body                        | Response                         |
|--------|--------------------------|------|-----------------------------|----------------------------------|
| POST   | `/user/block/:userId`    | Yes  | —                           | `{ message: "User blocked" }`   |
| DELETE | `/user/block/:userId`    | Yes  | —                           | `{ message: "User unblocked" }` |
| GET    | `/user/blocked`          | Yes  | —                           | `{ data: [blocked users] }`     |
| POST   | `/user/report/:userId`   | Yes  | `{ reason, description }`   | `{ message: "Report submitted" }` |

**Changes to existing logic**:
- `GET /feed` — exclude blocked users from results
- `POST /request/send` — prevent sending requests to/from blocked users
- `GET /user/connections` — optionally exclude blocked users

**New Files**:
- `src/models/report.js`
- `src/routes/safety.js` (or add to `user.js`)

**Changes**:
- `src/models/user.js` — add `blockedUsers` field
- `src/routes/user.js` — update feed query to exclude blocked

**Acceptance Criteria**:
- [ ] Blocked users don't appear in feed
- [ ] Can't send requests to blocked users
- [ ] Block is reversible (unblock)
- [ ] Reports stored with reason
- [ ] Duplicate block/report handled gracefully

---

### FEAT-12: Forgot Password & Email Verification

**Goal**: Password recovery and email verification flows.

**New Dependencies**:
```bash
npm install nodemailer   # Email sending
npm install crypto       # Token generation (built-in)
```

**Model Changes**: Add to User schema:
```javascript
emailVerified:       { type: Boolean, default: false },
verificationToken:   String,
verificationExpiry:  Date,
resetPasswordToken:  String,
resetPasswordExpiry: Date
```

**New Route File**: `src/routes/authExtended.js`

| Method | Endpoint                   | Auth | Body                         | Response                                  |
|--------|---------------------------|------|------------------------------|-------------------------------------------|
| POST   | `/auth/forgot-password`   | No   | `{ email }`                  | `{ message: "Reset email sent" }`         |
| POST   | `/auth/reset-password`    | No   | `{ token, newPassword }`     | `{ message: "Password updated" }`         |
| POST   | `/auth/verify-email`      | No   | `{ token }`                  | `{ message: "Email verified" }`           |
| POST   | `/auth/resend-verification` | Yes | —                            | `{ message: "Verification email sent" }`  |
| PATCH  | `/auth/change-password`   | Yes  | `{ currentPassword, newPassword }` | `{ message: "Password changed" }`  |

**Environment Variables** (add to `.env`):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
```

**Flow — Forgot Password**:
1. User submits email to `/auth/forgot-password`
2. Server generates crypto random token, saves hash to user doc with 1h expiry
3. Server sends email with link: `{FRONTEND_URL}/reset-password?token=...`
4. User clicks link, submits new password to `/auth/reset-password`
5. Server verifies token, hashes new password, saves, clears token

**Flow — Email Verification**:
1. On signup, generate verification token, save to user, send email
2. Email contains link: `{FRONTEND_URL}/verify-email?token=...`
3. User clicks, frontend calls `/auth/verify-email`
4. Server marks `emailVerified: true`, clears token

**New Files**:
- `src/routes/authExtended.js`
- `src/utilis/emailService.js` — Nodemailer transporter + email templates

**Changes**:
- `src/models/user.js` — add verification/reset fields
- `src/routes/auth.js` — trigger verification email on signup
- `src/app.js` — mount authExtended routes

**Acceptance Criteria**:
- [ ] Forgot password sends email with reset link
- [ ] Reset link works within 1 hour, expires after
- [ ] Password updated successfully via reset
- [ ] Signup triggers verification email
- [ ] Email verification marks user as verified
- [ ] Change password requires current password
- [ ] Strong password validation on all password changes

---

## API Priority & Effort Summary

| Order | Feature | ID      | New Endpoints | New Models | Effort |
|-------|---------|---------|---------------|------------|--------|
| 1     | Protected Routes      | FEAT-01 | 0 | 0 | None    |
| 2     | 404 Page              | FEAT-02 | 0 | 0 | None    |
| 3     | Tech Stack Tags       | FEAT-03 | 0 | 0 | None (already supported) |
| 4     | Skeleton Loaders      | FEAT-05 | 0 | 0 | None    |
| 5     | Swipe Card UI         | FEAT-04 | 0 | 0 | None    |
| 6     | Real-time Chat        | FEAT-06 | 4 | 1 | Large   |
| 7     | Notifications         | FEAT-07 | 4 | 1 | Medium  |
| 8     | Search & Filters      | FEAT-08 | 1 | 0 | Small   |
| 9     | GitHub Integration    | FEAT-09 | 5 | 0 | Large   |
| 10    | Theme Toggle          | FEAT-10 | 0 | 0 | None    |
| 11    | Block/Report          | FEAT-11 | 4 | 1 | Medium  |
| 12    | Auth Flows            | FEAT-12 | 5 | 0 | Large   |

> **Note**: FEAT-01 through FEAT-05 require NO backend changes. Backend work starts at FEAT-06 (Chat).
