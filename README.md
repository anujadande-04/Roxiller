# Roverly

Roverly is a full-stack store rating platform. Users can discover registered stores and submit ratings from 1 to 5. A shared authentication system routes each account to the correct experience based on its role.

## Project Overview

The project contains:

- A React and Vite frontend for authentication, dashboards, store discovery, ratings, and administration.
- An Express REST API for authentication, authorization, store management, user management, ratings, and owner analytics.
- A local SQLite database with automatic schema creation and demo seed data.
- JWT-based sessions and bcrypt password hashing.

## Technologies Used

### Frontend

- React 19
- Vite
- JavaScript (JSX)
- CSS with responsive layouts

### Backend

- Node.js
- Express 5
- SQLite using `better-sqlite3`
- JWT using `jsonwebtoken`
- Password hashing using `bcryptjs`
- CORS

### Development Tools

- npm
- Oxlint
- Concurrently for running frontend and backend together

## Project Structure

```text
Roxiller/
├── backend/
│   ├── db.js
│   ├── index.js
│   └── validation.js
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env.example
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

From the project root:

```bash
npm install
```

Optional environment configuration:

```powershell
Copy-Item .env.example .env
```

Set a long random `JWT_SECRET` in `.env` for anything beyond local development.

## Database Setup

No manual database installation is required.

When the backend starts, `backend/db.js` automatically:

1. Creates `backend/roxiller.sqlite`.
2. Enables foreign keys and WAL mode.
3. Creates the `users`, `stores`, and `ratings` tables.
4. Seeds administrator, store owner, normal user, stores, and a sample rating.

The SQLite database files are ignored by Git:

```text
backend/roxiller.sqlite
backend/roxiller.sqlite-shm
backend/roxiller.sqlite-wal
```

To reset local demo data, stop the backend and remove those three files. They will be recreated on the next backend start.

## Features Implemented

### Authentication and Authorization

- Login for administrators, store owners, and normal users.
- Registration with account type selection.
- Role-aware dashboard routing.
- JWT authentication.
- Bcrypt password hashing.
- Role enforcement on protected API endpoints.
- Logout by clearing the frontend session.

### System Administrator

- Live dashboard totals for users, stores, and ratings.
- Add normal users, store owners, and administrators.
- Add new stores.
- Search users and stores.
- View users with email, address, role, and status.
- View stores with email, address, and average rating.
- Server-side authorization for administrator endpoints.

### Normal User

- Browse all registered stores.
- Search stores by name and address.
- View average store ratings and rating counts.
- Select a rating from 1 to 5.
- Submit a new rating.
- Update an existing rating.

### Store Owner

- View the owned store.
- View the average rating.
- View total ratings.
- View users who submitted ratings.

### Validation

Validation is enforced in both the frontend forms and backend API:

- Name: 20 to 60 characters.
- Address: required and maximum 400 characters.
- Password: 8 to 16 characters, including at least one uppercase letter and one special character.
- Email: standard email format.
- Rating: integer from 1 to 5 only.

Ratings use a unique `(store_id, user_id)` database constraint, so submitting another rating updates the existing rating instead of creating a duplicate.

## How To Run The Project

### Run frontend and backend together

```bash
npm run dev:full
```

Open the frontend at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:3001
```

### Run separately

Terminal 1, backend:

```bash
npm run server
```

Terminal 2, frontend:

```bash
npm run dev
```

If Vite reports that port 5173 is busy, it automatically selects another available port such as 5174 or 5175.

### Production build

```bash
npm run build
```

### Code quality check

```bash
npm run lint
```

## Initial Login Credentials

Select the matching role on the login page.

### System Administrator

```text
Email: admin@roverly.local
Password: Admin@123
Role: System administrator
```

### Store Owner

```text
Email: owner@roverly.local
Password: Welcome@123
Role: Store owner
```

The initial store owner is assigned to the seeded Harbor and Pine store.

### Normal User

```text
Email: user@roverly.local
Password: Welcome@123
Role: Normal user
```

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### User

- `PATCH /api/users/me/password`

### Stores and Ratings

- `GET /api/stores`
- `POST /api/stores/:storeId/ratings`

### Store Owner

- `GET /api/owner/dashboard`

### Administrator

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/stores`
- `POST /api/admin/stores`

### Health Check

- `GET /api/health`
