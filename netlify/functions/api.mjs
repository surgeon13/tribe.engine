/**
 * Netlify Function: /api/* → /.netlify/functions/api/:splat
 * Read-only host — tribe create returns a browser-session preview.
 */
import { handleApiRequest } from "../../lib/api/router.js";

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(), body: "" };
    }

    // Prefer path from redirect splat / raw URL — event.path can vary by runtime.
    const pathname =
      event.path ||
      (event.rawUrl ? new URL(event.rawUrl).pathname : "/api") ||
      "/api";

    const result = await handleApiRequest({
      method: event.httpMethod,
      pathname,
      query: event.queryStringParameters || {},
      body: event.httpMethod === "GET" || event.httpMethod === "DELETE" ? undefined : parseBody(event),
      persist: false,
    });

    const headers = corsHeaders(result.headers || {});
    if (result.status === 204) {
      return { statusCode: 204, headers, body: "" };
    }
    return {
      statusCode: result.status,
      headers,
      body: JSON.stringify(result.body ?? {}),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: e.message || String(e) }),
    };
  }
}
