export const LOGO_FALLBACK_PATH = "/instituicoes/_fallback.svg";

/** Fonte da logo: o `logoUrl` da API, ou o fallback estático quando é null. */
export function logoSrc(logoUrl: string | null | undefined): string {
  return logoUrl && logoUrl.length > 0 ? logoUrl : LOGO_FALLBACK_PATH;
}
