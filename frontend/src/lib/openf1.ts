const BASE = "https://api.openf1.org/v1";

export type HttpResult<T> = { data: T | null; error: string | null };

const REQUEST_TIMEOUT_MS = 12000;
const RETRIES = 2;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function http<T>(path: string, init?: RequestInit): Promise<HttpResult<T>> {
  const url = `${BASE}${path}`;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        ...init,
        headers: { accept: "application/json", ...(init?.headers || {}) },
      });

      if (!res.ok) {
        // retry transient server/rate-limit responses
        if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        return { data: null, error: `${res.status} ${res.statusText}` };
      }

      const data = (await res.json()) as T;
      return { data, error: null };
    } catch (e: any) {
      if (attempt < RETRIES) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      return { data: null, error: e?.message ?? "Network error" };
    }
  }

  return { data: null, error: "Request failed" };
}

export async function httpFallback<T>(paths: string[], init?: RequestInit): Promise<HttpResult<T>> {
  let lastError: string | null = null;
  for (const path of paths) {
    const res = await http<T>(path, init);
    if (res.data !== null) return res;
    lastError = res.error;
  }
  return { data: null, error: lastError ?? "No data" };
}

// Utility: format lap time to mm:ss:µs from milliseconds or microseconds input
export function formatLapTime(ms?: number | null): string {
  if (ms == null || !isFinite(ms)) return "—";
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const micros = (totalMs % 1000) * 1000; // represent microseconds
  const mm = String(minutes);
  const ss = String(seconds).padStart(2, "0");
  const uuuuuu = String(micros).padStart(6, "0");
  return `${mm}:${ss}:${uuuuuu}`;
}

// Types (subset)
export interface SessionDto {
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_key: number;
  country_name: string;
  date_end: string;
  date_start: string;
  gmt_offset: string;
  location: string;
  meeting_key: number;
  session_key: number;
  session_name: string;
  session_type: string;
  year: number;
}

// Fetch the latest completed or ongoing Race session by date_end
export async function getLatestRaceSession(): Promise<HttpResult<SessionDto | null>> {
  const candidates = [
    "/sessions?session_name=Race&year%3E%3D2023",
    "/sessions?session_name=Race&year%3E%3D2022",
    "/sessions?session_name=Race",
  ];

  const { data, error } = await httpFallback<SessionDto[]>(candidates);
  if (error) return { data: null, error };
  if (!data || data.length === 0) return { data: null, error: null };
  const sorted = [...data].sort(
    (a, b) => new Date(a.date_end).getTime() - new Date(b.date_end).getTime()
  );
  return { data: sorted.at(-1) ?? null, error: null };
}

export interface WeatherDto {
  air_temperature: number;
  date: string;
  humidity: number;
  meeting_key: number;
  pressure: number;
  rainfall: number;
  session_key: number;
  track_temperature: number;
  wind_direction: number;
  wind_speed: number;
}

export async function getLatestWeather(meeting_key: number): Promise<HttpResult<WeatherDto | null>> {
  const { data, error } = await http<WeatherDto[]>(`/weather?meeting_key=${meeting_key}`);
  if (error) return { data: null, error };
  if (!data || data.length === 0) return { data: null, error: null };
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return { data: sorted.at(-1) ?? null, error: null };
}
