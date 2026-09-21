# BloodBridge

Web-based blood donation management platform (Next.js, TypeScript, Prisma, PostgreSQL). Requirements are defined in the BloodBridge SRS v2.0.

## Getting started

1. Install dependencies: `npm install`
2. Configure `.env` (see below), then apply the database schema: `npx prisma migrate deploy` and `npx prisma generate`
3. Start the app: `npm run dev`, then open [http://localhost:3000](http://localhost:3000)
4. Start the AI assistant in a second terminal: `npm run ai` (see below)

## Tests

`npm test` runs the Jest suite (`npm run test:coverage` for a coverage report).
No database, SMTP server or AI model needs to be running. See
[tests/README.md](tests/README.md) for how it is wired and how to add a test.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret used to sign session tokens |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email delivery (FR-44). Test it from System admin > Settings. |
| `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Optional AI provider override (defaults to the local model below) |
| `SMS_PROVIDER` and provider keys | Optional SMS notifications (FR-45): `africastalking` or `twilio`. See the comments in `src/lib/sms.ts`. |

## AI assistant (free, runs locally)

The chatbot and the lab AI recommendations use a free Hugging Face model, [Qwen2.5 1.5B Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), served by [llama.cpp](https://github.com/ggml-org/llama.cpp). No API key or payment is needed.

One-time setup, in `%USERPROFILE%\bloodbridge-ai`:

1. Download `llama-<build>-bin-win-cpu-x64.zip` from the llama.cpp releases and unzip it into a `llama` subfolder.
2. Download `qwen2.5-1.5b-instruct-q4_k_m.gguf` (about 1.1 GB) into the folder itself.

Then run `npm run ai` and keep that window open. The model is served at `http://127.0.0.1:8080/v1`, which the app calls from the server only. If it isn't running, the chat shows a friendly "unable to reach the assistant" message and the rest of the platform keeps working.

To use Hugging Face's hosted service instead, set `AI_BASE_URL=https://router.huggingface.co/v1`, `AI_MODEL` (for example `Qwen/Qwen2.5-7B-Instruct`) and `AI_API_KEY` (a Hugging Face access token). All AI calls go through `src/lib/ai-client.ts`.

## Roles

| Role | Home |
|---|---|
| Donor | `/home` |
| Medical staff | `/portal/medical-staff` |
| Lab technician | `/portal/lab-technician` |
| Health institute admin | `/portal/institute-admin` |
| System admin | `/system-admin` |

Staff and admins open their account settings (name, phone, password) by clicking their name at the bottom of the sidebar.
