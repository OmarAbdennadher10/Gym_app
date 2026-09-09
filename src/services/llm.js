/**
 * Calls the Kimi (Moonshot AI) chat completions API and returns parsed JSON.
 * Moonshot's API is OpenAI-compatible, so this uses the standard
 * /chat/completions shape rather than Anthropic's /messages shape.
 * The API key lives only here, server-side, from an environment variable —
 * never in the Flutter client, never committed to source control.
 */
async function callLlm({ system, prompt }) {
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL || "openai/gpt-oss-120b";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text content returned by model');

  return parseJsonLoose(text);
}

/** Strips markdown code fences if the model added them despite instructions,
 *  then parses JSON. Throws a clear error if it still isn't valid JSON so the
 *  caller can retry rather than silently serving garbage to the app. */
function parseJsonLoose(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Model did not return valid JSON: ${err.message}`);
  }
}

/** Calls the LLM, retries once on malformed JSON (models occasionally slip). */
async function callLlmWithRetry(args) {
  try {
    return await callLlm(args);
  } catch (err) {
    if (String(err.message).includes('valid JSON')) {
      return await callLlm(args);
    }
    throw err;
  }
}

module.exports = { callLlm, callLlmWithRetry };
