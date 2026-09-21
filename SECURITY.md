# BloodBridge security notes

Covers SRS §9 (Security Requirements), NFR-01 to NFR-03 and §6.1 (Data Integrity).

## SQL injection

SQL injection happens when user input is concatenated into a SQL string, so the database parses part of that input as SQL. BloodBridge never builds SQL strings. The defence is layered, so a mistake at one layer is caught by another.

### Layer 1 — Data access: parameterised queries only (the layer that actually prevents it)

All database access goes through Prisma (`src/lib/prisma.ts`, PostgreSQL via `@prisma/adapter-pg`). Prisma compiles a query like

```ts
prisma.user.findMany({ where: { email: { contains: search } } })
```

into a prepared statement whose values are sent separately from the SQL text. The database never parses a submitted value as SQL, so `'; DROP TABLE users; --` is searched for as that literal string. Prisma also escapes `%` and `_` in `contains`/`startsWith` filters, so wildcard input can't widen a search either.

There is **no** raw SQL anywhere in the project: no `$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe`, no second database driver (`pg`, `knex`, …), and no string-built queries. Verify with:

```bash
grep -rn '\$queryRaw\|\$executeRaw\|new Pool(\|new Client(' app src --include=*.ts
```

### Layer 2 — A lint rule that keeps it that way

`eslint.config.mjs` fails the build on `$queryRawUnsafe`, `$executeRawUnsafe` and `$runCommandRaw` — the only Prisma APIs that accept a SQL string. New code that reintroduces raw SQL is rejected by `npm run lint`, so this is a standing guarantee rather than a one-off review. Prisma's tagged-template form (`` $queryRaw`SELECT … ${value}` ``) stays available and is still parameterised.

### Layer 3 — Query shape is never taken from user input

Table, column and sort names are written as literals in the code. No endpoint accepts a field name, sort key or filter key from the request, so input can only ever land in a *value* position, never in the query structure.

### Layer 4 — Typed validation at the request boundary

Every request value is coerced and bounded before it reaches a query, using `src/lib/input.ts`:

| Helper | Guarantee |
|---|---|
| `text(value, maxLength)` | A trimmed string, length-capped (search terms 100, notes 1000) |
| `id(value)` | Matches `^[A-Za-z0-9_-]{1,64}$` (the cuid character set), else the route returns 400 |
| `oneOf(value, allowed)` | Only a listed enum value passes |
| `integer(value, {min, max})` | A whole number in range |
| `dateString(value)` | `YYYY-MM-DD` and a real calendar date |

Enum-typed fields (blood group, urgency, status, role, audit action, appointment time) are checked against fixed lists — `src/lib/blood-compatibility.ts`, `src/lib/audit-actions.ts`, `src/lib/appointment-slots.ts` — so an unknown value is a 400, not a query.

### Layer 5 — Schema and authorisation

PostgreSQL columns are typed and constrained by `prisma/schema.prisma` (enums, foreign keys, unique indexes), so even a value that passed validation cannot violate a relationship. Independently, every endpoint authorises the caller server-side (`src/lib/auth.ts`) and scopes queries to that user's own rows or their health institute, so an injected value could never reach another institute's data.

### Verification

A script run against the development database sent six classic payloads (`'; DROP TABLE users; --`, `' OR '1'='1`, `admin'--`, `1; DELETE FROM appointments WHERE 1=1; --`, `' UNION SELECT email, password_hash FROM users --`, `%' OR 1=1 --`) through the same query paths the API uses — donor search, lookup by route id, and enum fields. Every payload was treated as ordinary text: the searches returned 0 rows, the id lookups were rejected by validation, the enum checks were rejected, and the user and appointment tables were unchanged (27 users and 10 appointments before and after).

### Residual risks

- A future developer could add a raw query through a driver this lint rule doesn't know about. Keep database access in `src/lib/prisma.ts`.
- For defence in depth in production, connect the application with a PostgreSQL role that owns no DDL rights (no `DROP`/`ALTER`), so even a hypothetical injection could not drop a table. Migrations should run under a separate, more privileged role.

## Related protections

- **Passwords** are hashed with bcrypt (cost 12) and never returned by an API.
- **Sessions** are signed JWTs (`jose`) in an HTTP-only cookie; every protected route verifies the token server-side.
- **Authorisation** is enforced in each route handler, not by hiding UI.
- **Rate limiting** (`src/lib/rate-limit.ts`) covers login, registration, password reset, password change and the AI endpoint.
- **Cross-site scripting**: React escapes rendered values by default; the one place HTML is assembled (emails, `src/lib/mail.ts`) escapes interpolated values.
- **Secrets** (`DATABASE_URL`, `AUTH_SECRET`, SMTP, AI and SMS keys) live in `.env`, which is gitignored, and are only read server-side.
- **AI**: the model runs locally and is called from the server only, so no key reaches the browser (FR-40).
