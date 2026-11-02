# AGENTS.md — AI Agent Rules & Guidelines (Gemini & Claude Sonnet)

This document provides project context, guidelines, and behavioral directives for AI coding agents (**Gemini**, **Claude Sonnet**, Antigravity, Cursor, etc.) working on **VegBazar_Backend**.

---

## 1. Project Overview & Tech Stack

- **Runtime & Module System**: Node.js with **ES Modules (`"type": "module"`)**. Always use `import`/`export`, **never** `require()`.
- **Framework**: Express.js (`v4.22+`)
- **Database**: MongoDB via Mongoose (`v8.6+`)
- **Authentication**: JWT (`jsonwebtoken`), `express-jwt`, `bcryptjs`, Google Auth (`google-auth-library`)
- **File Storage & Uploads**: Cloudinary, Multer
- **Payments**: Razorpay
- **Documents & Exports**: `exceljs`, `pdfkit`, `nodemailer`
- **Testing & Formatting**: Jest (`npm test`), Supertest, Prettier

---

## 2. Directory Structure

```
VegBazar_Backend/
├── app.js               # Express application initialization & middleware stack
├── index.js             # Entry point (DB connection & HTTP server start)
├── const.js             # Global constants & configuration values
├── src/
│   ├── db/              # Database connection logic
│   ├── Model/           # Mongoose schemas and data models
│   ├── controller/      # Business logic and request handlers
│   ├── routes/          # API route definitions
│   ├── middleware/      # Auth, role-based access, file upload, error handling
│   └── utility/         # Helper functions (Cloudinary upload, Mail, PDF generators)
└── VEGBAZAR_FEATURES.md # Feature tracking documentation
```

---

## 3. Core Development Rules

### Rule 1: Module System Strictness
- Use standard ES module imports (`import express from 'express'`).
- Always include `.js` file extensions in local import paths (e.g., `import { userModel } from '../Model/user.model.js'`).

### Rule 2: Architecture & Separation of Concerns
- **Routes**: Define HTTP paths and attach controllers/middlewares only. No inline DB queries in route files.
- **Controllers**: Implement request validation, call utility services/models, and return standard JSON responses.
- **Models**: Define clean Mongoose schemas with proper timestamps (`timestamps: true`), validation rules, and indexes.
- **Middlewares**: Encapsulate reusable checks (e.g., token verification, role authorization, file parsing).

### Rule 3: Error Handling & Response Standards
- Wrap async controller logic using standard `try-catch` blocks or an async error handler wrapper.
- Do **not** swallow errors silently. Pass errors to `next(err)` or return standard error responses:
  ```json
  {
    "success": false,
    "message": "Human readable error description",
    "error": "Error details or stack (in non-prod)"
  }
  ```
- Return proper HTTP status codes (`200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `500` Server Error).

### Rule 4: Security & Environment Variables
- Never hardcode secrets, API keys, JWT secrets, or DB URIs.
- Read credentials from `process.env`.
- Ensure sensitive fields (e.g., `password`) are excluded from model responses (`select: false` or manual deletion before returning JSON).

### Rule 5: Code Modification Integrity
- Maintain existing codebase style and existing functional contracts.
- Check surrounding code before editing to avoid introducing syntax errors or circular imports.
- Format modified files cleanly.

---

## 4. Model-Specific Directives

### Directives for Gemini (Gemini 3.6 Flash / Pro)
- **Precise File Edits**: Provide complete, non-truncated replacement blocks.
- **Null Safety**: Double-check `null`/`undefined` guards when querying Mongoose models (e.g. check `if (!user)` before dereferencing `user.role`).
- **Async Safety**: Ensure all async operations are awaited properly.

### Directives for Claude Sonnet (Claude 3.5 / 3.7 Sonnet)
- **Minimal Invasive Changes**: Modify only lines directly relevant to the user request.
- **Strict Verification**: Validate changes against existing test suite (`npm test`) when adding or editing logic.
- **Refactoring Caution**: Avoid unnecessary architectural overhaul unless explicitly requested.

---

## 5. Development & Test Commands

```bash
# Start development server with live reload
npm run dev

# Start server in production mode
npm start

# Run unit and integration tests (ESM Jest configuration)
npm test
```
