export type SmokeResult = {
  response: Response;
  body: unknown;
  cookie: string;
};

type SmokeRequestOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  localHint?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function isLocalBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
    return `${error.name}: ${error.message}${cause}`;
  }
  return String(error);
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "TypeError" || error.name === "AbortError";
}

function localServiceHint(baseUrl: string, detail: string) {
  return [
    `Unable to reach local HR Nexus at ${baseUrl}.`,
    "请先运行 npm run start 或 npm run dev，然后重新执行 smoke。",
    `Network detail: ${detail}`,
  ].join(" ");
}

export async function smokeRequest(baseUrl: string, path: string, init: SmokeRequestOptions = {}): Promise<SmokeResult> {
  const { timeoutMs = 8000, retries = 2, retryDelayMs = 500, localHint = true, ...requestInit } = init;
  const url = `${baseUrl}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(requestInit.headers ?? {}) },
      });
      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();
      const body = contentType.includes("application/json") && text ? JSON.parse(text) : text;
      return {
        response,
        body,
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isNetworkError(error)) break;
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  const detail = errorMessage(lastError);
  if (localHint && isLocalBaseUrl(baseUrl)) {
    throw new Error(localServiceHint(baseUrl, detail));
  }
  throw new Error(`Smoke request failed for ${url}. ${detail}`);
}

export function assertJsonSuccess(name: string, result: SmokeResult) {
  const body = result.body as { success?: boolean } | null;
  if (!result.response.ok || body?.success !== true) {
    throw new Error(`${name} failed with ${result.response.status}: ${JSON.stringify(result.body)}`);
  }
}
