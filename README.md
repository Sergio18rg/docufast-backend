# DocuFast Backend

## Overview
DocuFast Backend is the REST API and business logic layer of the DocuFast platform.
It handles authentication, authorization, data validation, and communication with the database through Prisma ORM.

---

## Technologies Used
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt
- dotenv

---

## Project Structure
```
src/
 ├── app.ts
 ├── server.ts
 ├── routes/
 ├── modules/
 │   └── auth/
 ├── middleware/
 ├── lib/
 │   └── prisma.ts
 ├── utils/
 │   └── jwt.ts
 └── types/

The backend includes Prisma ORM files to be able to run it local easily. 
Although the DB is conceptually a separate architectural layer, the configuration is managed from the backend for project simplicity.
prisma/
 ├── schema.prisma
 ├── migrations/
 └── seed.ts

.env
```
---

## Database

The project uses PostgreSQL with Prisma ORM.

Main tables:
- users
- roles
...WIP

Relationships:
- A user belongs to a role
- A role can have many users
...WIP

---

## Installation Guide

### Prerequisites
Install:
- Node.js >= 24
- npm
- PostgreSQL (UI PgAdmin4)
- Git

Check versions:
- node -v
- npm -v
- psql --version

---

### Clone repository
git clone https://github.com/Sergio18rg/docufast-backend

cd docufast-backend

---

### Install dependencies
npm install

---

### Environment variables
Create a .env file in the root:

PORT=4000

DATABASE_URL="postgresql://DB_USER@localhost:5432/docufast_db"

JWT_SECRET="your_super_secret_key"

FRONTEND_URL=http://localhost:3000

---

### Database Setup

Install PostgreSQL and create database:

createdb docufast_db

Run migrations:
- npx prisma migrate dev

Generate Prisma client:
- npx prisma generate

Seed database:
- npm run seed

---

### Run backend
npm run dev

Server will run on:
http://localhost:4000

Health check:
http://localhost:4000/api/health


---

## Test Users

| Role | Email | Password |
|------|------|----------|
| Administrator | admin@docufast.com | Admin1234! |
| Worker | worker@docufast.com | Worker1234! |
| External | external@docufast.com | External1234! |

---

## Available Scripts
- npm run dev
- npm run start
- npm run seed

---

## Notes
This backend is part of the DocuFast Final Degree Project and provides authentication, role-based access control, and database management.
