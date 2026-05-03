# DocuFast Backend

## Overview
DocuFast Backend is the REST API and business logic layer of the DocuFast platform.
It handles authentication, authorization, data validation, and communication with the database through Prisma ORM.

---

## Technologies Used

**Backend & Framework:**
- Node.js (v24+)
- Express.js
- TypeScript

**Database:**
- PostgreSQL
- Prisma ORM

**Authentication & Security:**
- JWT (JSON Web Tokens)
- bcrypt (password hashing)

**AI Integration:**
- Google Gemini API (document data extraction)

**File Handling:**
- Multer (multipart/form-data)

**Development:**
- dotenv (environment variables)

---

## Project Structure
```
src/
 ├── app.ts                    # Express app configuration
 ├── server.ts                 # Server entry point
 ├── constants/                # App-wide constants
 ├── middlewares/              # Auth & role-based access control
 ├── routes/                   # Main route registry
 ├── modules/
 │   ├── auth/                 # Authentication & login
 │   ├── ai/                   # AI document extraction
 │   ├── clients/              # Client management
 │   ├── workers/              # Worker management
 │   └── vehicles/             # Vehicle management
 ├── lib/                      # External integrations (Prisma, JWT)
 └── utils/                    # Helper functions

prisma/
 ├── schema.prisma             # Database schema
 ├── migrations/               # Database migrations
 └── seed.ts                   # Initial data seeding

uploads/                       # Document file storage
```
---

## Database

The project uses PostgreSQL with Prisma ORM.

**Main tables:**
- `roles` - User role definitions (Admin, Worker, External)
- `users` - System users with authentication credentials
- `clients` - Client companies that hire workers
- `workers` - Workers with personal and contract information
- `vehicles` - Company vehicles fleet
- `worker_vehicle_assignments` - Historical tracking of worker-vehicle assignments
- `document_types` - Document type definitions by entity (Worker, Vehicle, Client)
- `documents` - Uploaded document files with metadata
- `entity_documents` - Polymorphic relation linking documents to entities

**Key relationships:**
- A `user` belongs to one `role`; a `role` can have many `users`
- A `user` can optionally be linked to a `worker` or `client` (1:1)
- A `worker` belongs to one `client`; a `client` can have many `workers`
- A `worker` can be assigned to a `vehicle` (current assignment)
- `worker_vehicle_assignments` tracks historical assignments between workers and vehicles
- A `document` has a `document_type` and can be linked to multiple entities through `entity_documents`

---

## AI Document Extraction

The backend includes AI-powered document data extraction capabilities for workers, vehicles, and clients.

**Provider:** Google Gemini (default)
- The architecture supports multiple AI providers for future extensibility
- Currently integrated with Gemini 2.5 Flash model

**Configuration:**
- Requires `GEMINI_API_KEY` in environment variables
- Optional: `GEMINI_MODEL` to specify a different model (defaults to gemini-2.5-flash)

**Functionality:**
- Extracts structured data from uploaded documents (PDFs, images)
- Supports entity-specific field extraction
- Normalizes dates, handles multiple documents per request

---

## Installation Guide

### Prerequisites
Install:
- Node.js >= 24
- npm
- PostgreSQL (with PgAdmin4 recommended)
- Git

Check versions:
```bash
node -v
npm -v
psql --version
```

---

### Clone repository
```bash
git clone https://github.com/Sergio18rg/docufast-backend
cd docufast-backend
```

---

### Install dependencies
```bash
npm install
```

---

### Environment variables
Create a `.env` file in the root directory:

```env
PORT=4000
DATABASE_URL="postgresql://DB_USER@localhost:5432/docufast_db"
JWT_SECRET="your_super_secret_key_here"
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-2.5-flash"  # optional
```

**Important:**
- Replace `DB_USER` with your PostgreSQL username (e.g., `postgres` or your custom user)
- Generate a strong random string for `JWT_SECRET`
- Get your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)
- AI functionality requires a valid Gemini API key; other features work without it

---

### Database Setup

1. **Create database:**
```bash
createdb docufast_db
```

2. **Run migrations:**
```bash
npx prisma migrate dev
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Seed initial data:**
```bash
npm run seed
```

**Reset database if needed:**
```bash
npx prisma migrate reset
```

---

### Run backend
```bash
npm run dev
```

Server will run on: **http://localhost:4000**

Health check endpoint: **http://localhost:4000/api/health**

**Note:** The `uploads/` directory for document storage will be created automatically on first file upload.


---

## Test Users

| Role | Email | Password |
|------|------|----------|
| Administrator | admin@docufast.com | Admin1234! |
| Worker | worker@docufast.com | Worker1234! |
| External | external@docufast.com | External1234! |

---

## Available Scripts
```bash
npm run dev    # Start development server with hot reload
npm run start  # Start production server
npm run seed   # Seed database with initial data
```

---

## Notes
This backend is part of the DocuFast Final Degree Project and provides authentication, role-based access control, and database management.
