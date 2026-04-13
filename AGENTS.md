# AGENTS.md — ConnectDevs Backend Context

> Persistent context for AI agents working on this backend. Read this first before making changes.

---

## Project Overview

**ConnectDevs Backend** is the API server for the ConnectDevs developer social networking platform. It handles authentication, user profiles, connection requests, and the discovery feed.

- **Runtime**: Node.js + Express
- **Database**: MongoDB via Mongoose
- **Auth**: JWT tokens stored in HTTP-only cookies, passwords hashed with bcrypt
- **Port**: 3001 (configurable via `.env`)
- **Frontend**: React app at `../ConnectDevs/` (runs on `localhost:5173`)

---

## Directory Structure

```
src/
├── app.js                    # Express server setup, middleware, route mounting
├── config/
│   └── database.js           # MongoDB connection (mongoose.connect)
├── middlewares/
│   ├── auth.js               # Basic auth (currently unused — just logs)
│   └── userAuth.js           # JWT cookie verification, attaches req.user
├── models/
│   ├── user.js               # User schema + getJwt() + validatePassword()
│   └── connectionRequest.js  # Connection request schema + self-request prevention
├── routes/
│   ├── auth.js               # POST /signup, POST /login, POST /logout
│   ├── profile.js            # GET /profile/view, PATCH /profile/edit
│   ├── request.js            # POST /request/send/:status/:userId, POST /request/review/:status/:requestId
│   └── user.js               # GET /user/requests/received, GET /user/connections, GET /feed
└── utilis/
    └── helper.js             # validateSignup(), validateEditProfileData()
```

---

## Environment Variables (.env)

```
MONGODB_URL=mongodb://localhost:27017/connectdevs
PORT=3001
JWT_SECRET=your_jwt_secret_key    # NOTE: Currently not used — hardcoded "Hero@586" in code
JWT_EXPIRES_IN=1d                  # NOTE: Currently not used
```

> ⚠️ **Known Issue**: JWT secret is hardcoded as `"Hero@586"` in `src/middlewares/userAuth.js` and `src/models/user.js`. Should be migrated to `process.env.JWT_SECRET`.

---

## Models

### User Schema
| Field      | Type       | Required | Constraints                                           |
|-----------|-----------|----------|-------------------------------------------------------|
| firstName | String    | Yes      | minLength: 3, maxLength: 50                           |
| lastName  | String    | No       |                                                       |
| email     | String    | Yes      | Unique, lowercase, trimmed, validated with validator   |
| password  | String    | Yes      | Must be strong (validator.isStrongPassword)            |
| age       | Number    | No       | Min: 7                                                |
| gender    | String    | No       | Enum: ['male', 'female', 'other']                     |
| about     | String    | No       | Default: "This is the default about the user"          |
| skills    | [String]  | No       |                                                       |
| photoUrl  | String    | No       | Default: dummy avatar URL                              |

**Instance Methods**:
- `getJwt()` → generates JWT with `{ _id }`, expires in 1 day
- `validatePassword(enteredPassword)` → bcrypt.compare, returns boolean

**Indexes**: Composite on `(firstName, lastName)`

### ConnectionRequest Schema
| Field      | Type     | Required | Constraints                                         |
|-----------|---------|----------|-----------------------------------------------------|
| fromUserId | ObjectId | Yes      | Ref: "User"                                         |
| toUserId   | ObjectId | Yes      | Ref: "User"                                         |
| status     | String   | Yes      | Enum: ['ignore', 'interested', 'accepted', 'rejected'] |

**Pre-save hook**: Prevents `fromUserId === toUserId`
**Indexes**: Composite on `(fromUserId, toUserId)`

---

## API Endpoints

### Auth (no auth required)
| Method | Endpoint   | Body                                      | Response                     |
|--------|-----------|-------------------------------------------|------------------------------|
| POST   | `/signup`  | `{ firstName, lastName, email, password }` | `{ message, data: user }`   |
| POST   | `/login`   | `{ email, password }`                      | User object                  |
| POST   | `/logout`  | —                                          | "Logout successfully"        |

### Profile (auth required — `userAuth` middleware)
| Method | Endpoint         | Body                                                    | Response                        |
|--------|-----------------|--------------------------------------------------------|--------------------------------|
| GET    | `/profile/view`  | —                                                       | User object                    |
| PATCH  | `/profile/edit`  | Any of: firstName, lastName, email, photoUrl, gender, about, age, skills | `{ message, data: user }` |

### Connection Requests (auth required)
| Method | Endpoint                              | Params                              | Response                          |
|--------|--------------------------------------|-------------------------------------|----------------------------------|
| POST   | `/request/send/:status/:touserId`    | status: 'ignore'\|'interested'      | `{ message, data: request }`     |
| POST   | `/request/review/:status/:requestId` | status: 'accepted'\|'rejected'      | `{ message, data: request }`     |

### User Data (auth required)
| Method | Endpoint                   | Query           | Response                          |
|--------|---------------------------|-----------------|----------------------------------|
| GET    | `/user/requests/received`  | —               | `{ message, data: [requests] }`  |
| GET    | `/user/connections`        | —               | `{ data: [users] }`             |
| GET    | `/feed`                    | page, limit     | `{ data: [users] }`             |

---

## Auth Flow

1. **Signup**: Validate → hash password (bcrypt, 10 rounds) → save user → generate JWT → set cookie (8h)
2. **Login**: Find by email → bcrypt compare → generate JWT → set cookie (15min)
3. **Protected routes**: `userAuth` middleware extracts token from cookie → verify JWT → fetch user from DB → attach to `req.user`
4. **Logout**: Set cookie to null with immediate expiry

> ⚠️ **Cookie expiry inconsistency**: Signup sets 8h, Login sets 15min. Should be unified.

---

## Middleware

- **userAuth** (`src/middlewares/userAuth.js`): Core auth middleware. Extracts JWT from `req.cookies.token`, verifies, fetches user, attaches to `req.user`. Returns 400 if invalid.
- **auth** (`src/middlewares/auth.js`): Unused placeholder — just logs "User is authenticated".

---

## Validation

- **validateSignup(req)**: Checks firstName, lastName exist; email valid; password strong
- **validateEditProfileData(req)**: Whitelists editable fields: `firstName, lastName, email, photoUrl, gender, about, age, skills`

---

## Build & Dev Commands

```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Production start (node src/app.js)
```

---

## Coding Conventions

- **Error handling**: try/catch in route handlers, errors sent as plain strings
- **Response format**: Inconsistent — some return `{ message, data }`, some return raw data
- **Status codes**: Mix of 200, 400, 404, 500
- **Route mounting**: All routes mounted at `/` (no versioning like `/api/v1/`)
- **Typo in folder name**: `utilis/` should be `utils/`

---

## Known Issues

1. Hardcoded JWT secret (`"Hero@586"`) — should use env variable
2. Inconsistent cookie expiry (signup: 8h, login: 15min)
3. No password change endpoint
4. No rate limiting on auth endpoints
5. Unused `auth.js` middleware
6. `utilis/` folder typo (should be `utils/`)
7. Inconsistent error response format

---

## Feature Roadmap

See `docs/FEATURES_SPEC.md` for the full backend feature specification with API designs for new features.
