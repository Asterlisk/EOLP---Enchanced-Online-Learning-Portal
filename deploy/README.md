# Debian deployment templates

These templates assume the project is installed at `/opt/eolp`, PostgreSQL is local, Nginx serves the frontend, and the API listens only on `127.0.0.1:3000`.

## Prepare the server

1. Install Git, Node.js (a release compatible with the checked-in Vite and Prisma versions), PostgreSQL, and Nginx.
2. Create a restricted `eolp` Linux user and `/opt/eolp` checkout. Keep the Git checkout owned by an administrator or deploy account; grant the service user write access only to `server/uploads/`.
3. Create the production PostgreSQL database and role. Put its URL and a long random `JWT_SECRET` in `/etc/eolp/eolp.env`; set `HOST=127.0.0.1`, `PORT=3000`, and `CLIENT_ORIGINS=https://your-domain.example` there. Protect the file so only root and the service group can read it.
4. Install dependencies with `npm ci` in `server/` and `client/`. Generate the Prisma client and apply committed migrations from `server/` with `npx prisma generate` and `npx prisma migrate deploy`.
5. Build the client from `client/` with `VITE_API_BASE_URL=/api npm run build`.
6. Create `/opt/eolp/server/uploads/` and grant the `eolp` service user write access. Do not store uploaded files in a temporary directory; back them up with the database.
7. Copy `eolp.service.example` to `/etc/systemd/system/eolp.service` and `nginx.conf.example` into Nginx's site configuration. Replace the domain placeholders, then reload systemd and Nginx.
8. Enable HTTPS before using real accounts or student data. Permit public inbound traffic only on the web ports; keep PostgreSQL and the API port private.
9. Check `https://your-domain.example/api/health/db`, then create real accounts through the administrator workflow. Do not run the demo seed on production.

## Release updates

Fetch the intended Git revision, install dependencies with `npm ci`, run Prisma client generation and `npx prisma migrate deploy`, rebuild the client, then restart `eolp.service`. Back up PostgreSQL and `server/uploads/` before schema or release changes.

The service file uses Debian's usual `/usr/bin/node` path. Adjust it if Node.js is installed elsewhere. Review the Nginx upload limit against the server's configured upload policy before deployment.
