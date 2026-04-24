const env = require("../config/env");

function buildPrimaryConfig() {
  return {
    apiKey: env.LLM_API_KEY,
    model: env.LLM_MODEL,
    baseUrl: env.LLM_BASE_URL,
    source: "primary",
  };
}

function buildFallbackConfig() {
  return {
    apiKey: env.LLM_FALLBACK_API_KEY,
    model: env.LLM_FALLBACK_MODEL,
    baseUrl: env.LLM_FALLBACK_BASE_URL,
    source: "fallback",
  };
}

function hasOpenAI() {
  return Boolean(buildPrimaryConfig().apiKey || buildFallbackConfig().apiKey);
}

function isGeminiEndpoint(baseUrl) {
  return String(baseUrl || "").includes("generativelanguage.googleapis.com");
}

function truncateText(value, maxLen = 400) {
  const text = String(value || "");
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}... [truncated ${text.length - maxLen} chars]`;
}

function logLlmError(stage, error, extra = {}) {
  const payload = {
    stage,
    message: error?.message || String(error),
    status: error?.status || null,
    source: error?.source || null,
    ...extra,
  };
  console.error("[AI_AGENT][LLM_ERROR]", JSON.stringify(payload));
}

async function requestByConfig({ config, systemPrompt, userPrompt, temperature }) {
  let response;
  if (isGeminiEndpoint(config.baseUrl)) {
    const geminiUrl = `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationConfig: {
          temperature,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
      }),
    });
  } else {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  }

  if (!response.ok) {
    const raw = await response.text();
    const error = new Error(`LLM error ${response.status}: ${raw}`);
    error.status = response.status;
    error.source = config.source;
    error.provider = isGeminiEndpoint(config.baseUrl) ? "gemini" : "openai-compatible";
    error.responseText = truncateText(raw);
    throw error;
  }

  const data = await response.json();
  if (isGeminiEndpoint(config.baseUrl)) {
    const geminiText = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("\n");
    return typeof geminiText === "string" ? geminiText.trim() : null;
  }

  const openAiText = data?.choices?.[0]?.message?.content;
  return typeof openAiText === "string" ? openAiText.trim() : null;
}

async function chatCompletion({ systemPrompt, userPrompt, temperature = 0.2 }) {
  if (!hasOpenAI()) {
    return null;
  }

  const primary = buildPrimaryConfig();
  const fallback = buildFallbackConfig();

  if (!primary.apiKey && fallback.apiKey) {
    return requestByConfig({ config: fallback, systemPrompt, userPrompt, temperature });
  }

  try {
    return await requestByConfig({ config: primary, systemPrompt, userPrompt, temperature });
  } catch (err) {
    logLlmError("primary_request_failed", err, {
      provider: isGeminiEndpoint(primary.baseUrl) ? "gemini" : "openai-compatible",
      model: primary.model,
      baseUrl: primary.baseUrl,
      responseText: err?.responseText || null,
    });
    const shouldFailover = Number(err?.status) === 429 && Boolean(fallback.apiKey);
    if (!shouldFailover) {
      throw err;
    }
    try {
      return await requestByConfig({ config: fallback, systemPrompt, userPrompt, temperature });
    } catch (fallbackErr) {
      logLlmError("fallback_request_failed", fallbackErr, {
        provider: isGeminiEndpoint(fallback.baseUrl) ? "gemini" : "openai-compatible",
        model: fallback.model,
        baseUrl: fallback.baseUrl,
        responseText: fallbackErr?.responseText || null,
      });
      throw fallbackErr;
    }
  }
}

module.exports = {
  hasOpenAI,
  chatCompletion,
};
