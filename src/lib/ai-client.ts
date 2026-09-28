/*
  The one place BloodBridge talks to an AI provider (SRS §7.1). Any
  OpenAI-compatible chat-completions endpoint works. The defaults point at a
  free Hugging Face model (Qwen2.5 1.5B Instruct) served locally by llama.cpp;
  start it with `npm run ai`. For Hugging Face's hosted service instead, set
  AI_BASE_URL=https://router.huggingface.co/v1, AI_MODEL and AI_API_KEY (a
  Hugging Face token). Server-only, so the token never reaches the browser (FR-40).
*/

const BASE_URL = (process.env.AI_BASE_URL ?? "http://127.0.0.1:8080/v1").replace(/\/$/, "");

/*
  Whether a model is deployed at all. In development the local default is
  assumed (`npm run ai`). In production — Vercel, say — there is no model on
  127.0.0.1, so without AI_BASE_URL the model is skipped outright rather than
  tried and failed on every message; the system's own answers still work.
*/
export const aiEnabled = Boolean(process.env.AI_BASE_URL) || process.env.NODE_ENV !== "production";
const MODEL = process.env.AI_MODEL ?? "bloodbridge-assistant";
const API_KEY = process.env.AI_API_KEY;

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

type Options = { maxTokens?: number; temperature?: number; timeoutMs?: number };

function request(messages: AiMessage[], stream: boolean, options: Options) {
  return fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      stream,
      max_tokens: options.maxTokens ?? 600,
      temperature: options.temperature ?? 0.1,
      messages,
    }),
    // Local models on a CPU can take a while, especially on the first request.
    signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
  });
}

async function ensureOk(response: Response) {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI provider returned HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }
}

/** Streams the reply text. Throws on connection or provider errors. */
export async function* streamChat(messages: AiMessage[], options: Options = {}): AsyncGenerator<string> {
  const response = await request(messages, true, options);
  await ensureOk(response);

  if (!response.body) throw new Error("AI provider returned an empty stream.");

  // Server-sent events: lines of `data: {json}`, ending with `data: [DONE]`.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;

      const payload = data.slice(5).trim();
      if (payload === "[DONE]") return;

      const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) yield delta;
    }
  }
}

/** Returns the full reply, or null if the provider is unavailable. Never throws. */
export async function completeChat(messages: AiMessage[], options: Options = {}): Promise<string | null> {
  if (!aiEnabled) return null;

  try {
    const response = await request(messages, false, options);
    await ensureOk(response);

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (error) {
    console.error(`AI REQUEST FAILED (${BASE_URL}, ${MODEL}):`, error);
    return null;
  }
}

export const aiProviderLabel = `${MODEL} via ${BASE_URL}`;
