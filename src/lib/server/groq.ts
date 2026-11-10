import Groq from 'groq-sdk'

/**
 * The language model behind the AI routes.
 *
 * Both routes ask it for a single JSON object, so the model name, the key
 * lookup and the "answer is JSON" request live here rather than in each route.
 */

const MODEL = 'openai/gpt-oss-120b'

/** A client for the model, or null while no `GROQ_API_KEY` is configured. */
export function createGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY
  return apiKey ? new Groq({ apiKey }) : null
}

/**
 * Sends a system prompt and a user message and returns the JSON object the
 * model answers with. Throws when the call fails, when there is no answer, or
 * when the answer is not JSON — callers decide what each failure means to the
 * person waiting.
 */
export async function askForJson(
  groq: Groq,
  { system, user, temperature }: { system: string; user: string; temperature: number },
): Promise<Record<string, unknown>> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature,
  })

  const message = completion.choices[0]?.message
  if (!message) throw new Error('The model returned no answer.')
  return JSON.parse(message.content ?? '{}')
}
