/**
 * Wrapper sobre `@marsidev/react-turnstile` pra padronizar o uso no app.
 *
 * Re-exporta o componente `Turnstile` e os tipos relevantes, e expõe a
 * `siteKey` lida de `VITE_TURNSTILE_SITE_KEY` (com fallback pra chave de
 * sandbox always-pass da Cloudflare em dev/test).
 *
 * Uso típico:
 *   import { Turnstile, getTurnstileSiteKey } from "@/lib/captcha/turnstile";
 *
 *   <Turnstile
 *     siteKey={getTurnstileSiteKey()}
 *     onSuccess={(token) => setToken(token)}
 *     onError={() => setToken(null)}
 *     options={{ size: "invisible" }}
 *   />
 */

export { Turnstile } from "@marsidev/react-turnstile";
export type {
  TurnstileInstance,
  TurnstileProps,
} from "@marsidev/react-turnstile";

/**
 * Chave pública do widget Turnstile.
 *
 * Default = `1x00000000000000000000AA` — sandbox always-pass da Cloudflare.
 * Em produção, configure `VITE_TURNSTILE_SITE_KEY` no ambiente.
 */
export const TURNSTILE_SANDBOX_ALWAYS_PASS = "1x00000000000000000000AA";

export function getTurnstileSiteKey(): string {
  const fromEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // P-V17 wave 2: em build de produção (`import.meta.env.PROD === true`),
  // exige a env var configurada. Sem ela, cair no sandbox key da
  // Cloudflare significaria "captcha sempre passa em produção" — cego
  // pra bots. Lança no primeiro acesso (fail-fast no boot do bundle, não
  // só no submit do form).
  if (import.meta.env.PROD && (!fromEnv || fromEnv.trim() === "")) {
    throw new Error(
      "VITE_TURNSTILE_SITE_KEY ausente no build de produção. " +
        "Defina a env var antes de rodar `npm run build`. " +
        "Em dev/test, fallback para sandbox key da Cloudflare é aceito.",
    );
  }

  return fromEnv ?? TURNSTILE_SANDBOX_ALWAYS_PASS;
}
