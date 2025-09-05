type DataFetcher<T> = () => Promise<T>;

interface CacheOptions {
  cacheName?: string;
  ttl?: number;
}

const memoryCache = new Map<string, { data: any; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<any>>();

const DEFAULT_TTL = 60 * 60 * 1000;
const TIMESTAMP_HEADER = 'x-timestamp';

export async function fetchWithCache<T>(
  key: string,
  fetcher: DataFetcher<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { cacheName = 'default', ttl = DEFAULT_TTL } = options;
  const now = Date.now();

  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = executeRequest(key, fetcher, cacheName, ttl, now);
  pendingRequests.set(key, promise);

  return promise;
}

async function executeRequest<T>(
  key: string,
  fetcher: DataFetcher<T>,
  cacheName: string,
  ttl: number,
  now: number
): Promise<T> {
  try {
    const browserCached = await getBrowserCache(key, cacheName, ttl, now);
    if (browserCached) return browserCached;

    const data = await fetcher();

    memoryCache.set(key, { data, expiresAt: now + ttl });
    setBrowserCache(key, cacheName, data).catch(() => {}); // silent fail

    return data;
  } finally {
    pendingRequests.delete(key);
  }
}

async function getBrowserCache(key: string, cacheName: string, ttl: number, now: number) {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(key);

    if (!response) return null;

    const timestamp = Number(response.headers.get(TIMESTAMP_HEADER));
    if (now - timestamp > ttl) return null;

    const data = await response.json();
    memoryCache.set(key, { data, expiresAt: now + ttl });
    return data;
  } catch {
    return null;
  }
}

async function setBrowserCache(key: string, cacheName: string, data: any) {
  const cache = await caches.open(cacheName);
  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      [TIMESTAMP_HEADER]: String(Date.now())
    }
  });
  await cache.put(key, response);
}
