export const LOGO_FALLBACK_PATH = "/instituicoes/_fallback.svg";

/** Fonte da logo: a data-URI vinda do backend, ou o fallback estático. */
export function logoSrc(logo: string | null | undefined): string {
  return logo && logo.length > 0 ? logo : LOGO_FALLBACK_PATH;
}
