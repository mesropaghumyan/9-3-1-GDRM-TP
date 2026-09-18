export interface RequestOptions {
  headers?: Record<string, string>;
}

/**
 * Port technique interne à l'infrastructure (pas un port du domaine) :
 * abstrait le client HTTP concret pour permettre la décoration
 * (retry, circuit breaker) sans dépendre d'une librairie précise
 * (cf. docs/STD.md §3.7).
 */
export interface HttpClient {
  getJson<T>(url: string, params: Record<string, string>, opts?: RequestOptions): Promise<T>;
}
