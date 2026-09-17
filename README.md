# 📋 Project Management SaaS System Backend

[![Deployment Status](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://project-management-delta-blush.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)

A production-ready, type-safe **Project Management SaaS System Backend** built with **Node.js, Express, TypeScript, Prisma ORM, Neon PostgreSQL, Upstash Redis, bKash Payment Integration, Cloudinary, and Nodemailer**.

---

## 🌟 Live Links & Resources

- 🌐 **Live API Base URL**: `https://project-management-delta-blush.vercel.app/api/v1`
- 📄 **Postman Collection**: Located at `./postman_collection.json` inside the root directory.

---

## 🎯 What Problems Does This Project Solve? (User Benefits)

1. **Multi-Tenancy Organization Support**: Allows teams to create isolated organizations, invite members with distinct roles, and manage team workspaces independently.
2. **Automated Kanban Task Workflows**: Auto-generates boards and 4 default columns (`To Do`, `In Progress`, `Review`, `Done`) for seamless task status transitions.
3. **Seamless bKash Payment & Auto PDF Invoicing**: Supports real bKash sandbox subscription payments, automatic callback processing, refund management, and sends formatted PDF invoices directly to user emails.
4. **Audit Activity Tracking**: Logs critical team actions (task creation, status movements, deletions) in an activity log for complete compliance and security.
5. **Role-Based Security**: Enforces 3 fixed project roles (`ADMIN`, `MANAGER`, `MEMBER`) across all protected endpoints.
6. **Smart Profile Image Storage**: Uploads user profile photos to Cloudinary using Multer in-memory buffers and automatically destroys old images to prevent storage bloat.

---

## 🛠️ Tech Stack & Architecture

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js, TypeScript, Express.js | Type-safe RESTful API architecture |
| **Database & ORM** | Neon PostgreSQL + Prisma ORM | Relational data model with transactions, indexes, and soft deletes |
| **Caching & OTP Store** | Upstash Redis | Fast TTL caching for Redis OTP and bKash tokens |
| **Authentication** | JWT + Google OAuth (GCP) | Access/Refresh tokens + Email verification + Google login |
| **Input Validation** | Zod | Strict schema validation before request processing |
| **File Storage** | Multer & Cloudinary | Secure profile picture uploads with automatic cleanup |
| **Payments** | bKash Sandbox Gateway | Tokenized checkout, execute, redirect callbacks, & refunds |
| **Email & Reports** | Nodemailer + EJS + PDFKit | Custom HTML emails & dynamic in-memory PDF invoice attachments |
| **Security** | Helmet + CORS + Bcrypt | HTTP security headers, CORS origin control, password hashing |
| **Deployment** | Vercel Serverless Functions | Production backend deployment |

---

## 🔑 3 Fixed System Roles & Permissions

- 👑 **`ADMIN`**: Full platform control, dashboard statistics, user status toggling (Block/Active), system auditing.
- 💼 **`MANAGER`**: Creates Organizations, invites members, manages Teams, Projects, Kanban Boards, and initiates/executes payments.
- 👤 **`MEMBER`**: Collaborates on assigned tasks, updates task statuses, leaves comments, and views team activity.

---

## 📋 Complete 20+ API Endpoints Overview

### 1. Authentication & Profile (`/api/v1/auth`, `/api/v1/user`)
- `POST /api/v1/auth/register` - Register user & generate email OTP
- `POST /api/v1/auth/verify-email` - Verify email OTP code
- `POST /api/v1/auth/login` - Login with credentials (JWT Access + Refresh tokens)
- `POST /api/v1/auth/refresh-token` - Obtain new access token
- `POST /api/v1/auth/google-login` - Social authentication via Google OAuth
- `POST /api/v1/auth/forgot-password` - Request password reset OTP
- `POST /api/v1/auth/reset-password` - Reset account password
- `GET /api/v1/user/me` - Get logged-in user profile
- `PATCH /api/v1/user/update-profile` - Update profile & upload picture via Multer/Cloudinary

### 2. Organization & Multi-Tenancy (`/api/v1/organizations`)
- `POST /api/v1/organizations` - Create new organization (Promotes user to Manager)
- `GET /api/v1/organizations` - Get user's organization memberships
- `GET /api/v1/organizations/:id` - Get organization details & members
- `POST /api/v1/organizations/:id/invite` - Invite member with specific role

### 3. Team Management (`/api/v1/teams`)
- `POST /api/v1/teams` - Create team within an organization
- `POST /api/v1/teams/:id/members` - Add member to team
- `GET /api/v1/teams/:id` - Get team details & members

### 4. Project Management (`/api/v1/projects`)
- `POST /api/v1/projects` - Create project (Auto-generates Board & 4 Kanban columns)
- `GET /api/v1/projects` - Get all projects (Supports Pagination `?page=1&limit=10`, Search, and Filter)
- `GET /api/v1/projects/:id` - Get single project details
- `DELETE /api/v1/projects/:id` - Soft delete project (`isDeleted: true`)

### 5. Task & Kanban Workflow (`/api/v1/tasks`)
- `POST /api/v1/tasks` - Create task & log activity
- `PATCH /api/v1/tasks/:id/status` - Move task between Kanban columns & update status (`TO_DO`, `IN_PROGRESS`, `REVIEW`, `DONE`)
- `DELETE /api/v1/tasks/:id` - Soft delete task
- `POST /api/v1/tasks/:id/comments` - Add discussion comment to task
- `GET /api/v1/tasks/:id/activity-logs` - Fetch audit activity logs for task

### 6. bKash Payment Integration (`/api/v1/payments`)
- `POST /api/v1/payments/bkash/initiate` - Initiate tokenized bKash payment & get payment URL
- `POST /api/v1/payments/bkash/execute` - Execute payment & auto-send PDF invoice via email
- `GET /api/v1/payments/bkash/callback` - Gateway redirect callback handler (`success`, `cancel`, `failure`)
- `GET /api/v1/payments/history/:organizationId` - Get organization payment logs
- `POST /api/v1/payments/bkash/refund` - Trigger bKash payment refund (Admin only)

### 7. Admin Operations (`/api/v1/admin`)
- `GET /api/v1/admin/dashboard-stats` - Get platform statistics (Users, Orgs, Projects, Tasks)
- `PATCH /api/v1/admin/toggle-user-status/:userId` - Toggle user status (`ACTIVE` / `BLOCKED`)

---

## ⚡ Quick Start & Local Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/project-management-backend.git
cd project-management-backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
DATABASE_URL="postgresql://..."
REDIS_HOST="..."
REDIS_PORT=6379
JWT_ACCESS_SECRET="..."
CLOUDINARY_CLOUD_NAME="..."
BKASH_BASE_URL="..."
```

### 3. Database Migration & Seeding
```bash
npx prisma db push
npm run dev
```
*(Seeding runs automatically on server start to seed default Admin, Manager, and Member test accounts).*

---

## 📄 License
Distributed under the **ISC License**. Built with ❤️ for Assignment #8.
