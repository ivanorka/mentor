export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

/** The hosted prototype has no public Go runtime; use its embedded demo flows immediately. */
export function isStandaloneDemo() {
  if (typeof window === "undefined") return false;
  const localFrontend = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return !localFrontend && !process.env.NEXT_PUBLIC_API_BASE_URL && API_BASE_URL.includes("localhost");
}

type APIEnvelope<T> = {
  data: T;
  meta?: { total: number };
};

type APIErrorEnvelope = {
  error?: { code?: string; message?: string };
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { demoUserId?: string } = {},
): Promise<APIEnvelope<T>> {
  const { demoUserId, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    credentials: requestOptions.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...(demoUserId ? { "X-Demo-User-ID": demoUserId } : {}),
      ...headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as APIErrorEnvelope;
    throw new Error(payload.error?.message ?? `API zahtjev nije uspio (${response.status}).`);
  }
  return (await response.json()) as APIEnvelope<T>;
}
