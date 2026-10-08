# BestLink EOLP

BestLink EOLP is an online learning portal with student, teacher, and administrator workspaces.

## Local development

Requirements: Node.js and PostgreSQL.

1. Create `server/.env` from `server/.env.example` and set `DATABASE_URL` and a long random `JWT_SECRET`.
2. In `server/`, install packages, apply migrations with `npx prisma migrate deploy`, and start the API with `npm start`.
3. In `client/`, install packages and run `npm run dev`.
4. Open the Vite address shown in the client terminal. Local API requests default to `http://localhost:3000/api`.

For a local development database that has no migration history yet, use Prisma's development migration workflow instead of `migrate deploy`.

## Debian deployment outline

- Build the frontend with `VITE_API_BASE_URL=/api npm run build` from `client/`.
- Serve `client/dist/` through Nginx and proxy `/api/` to the Node API on `127.0.0.1:3000`.
- Configure `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `CLIENT_ORIGINS` in a protected server environment file; never commit it.
- Apply schema changes with `npx prisma migrate deploy` from `server/`.
- Keep `server/uploads/` on persistent storage and back it up with the database.
- Do not run the demo seed against production. Its course catalog is sample content and must be reviewed before live use.

## Account recovery

An authenticated administrator can issue a temporary password in User Management. If the administrator is locked out, run `npm run admin:reset-password -- <admin-username>` from `server/` on a machine with access to the production database. The generated password is printed once; share it securely and ask the user to change it after sign-in.

## Data and secrets

Environment files, build output, dependencies, logs, and uploaded assignment files are excluded from Git. The demo seed requires explicit `SEED_INSTRUCTOR_PASSWORD` and `SEED_STUDENT_PASSWORD` values.
