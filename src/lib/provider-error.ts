export type ProviderName = "openai" | "tmdb";

export type ProviderErrorCode =
  | "authentication"
  | "connection"
  | "invalid_request"
  | "quota"
  | "rate_limit"
  | "response"
  | "timeout"
  | "unavailable";

export class ProviderError extends Error {
  constructor(
    public readonly provider: ProviderName,
    public readonly code: ProviderErrorCode,
    public readonly responseStatus: number,
    public readonly publicMessage: string,
    options?: ErrorOptions,
  ) {
    super(`${provider} provider error: ${code}`, options);
    this.name = "ProviderError";
  }
}

export function logProviderError(context: string, error: ProviderError) {
  console.error(context, {
    provider: error.provider,
    code: error.code,
    responseStatus: error.responseStatus,
  });
}
