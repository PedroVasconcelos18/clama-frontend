/**
 * Wrapper sobre `@fingerprintjs/fingerprintjs` (v4 open-source) que devolve
 * um `device_hash` estável por dispositivo.
 *
 * - Cacheado em memória (`cached`) para não recomputar em re-renders
 *   subsequentes — o cálculo da assinatura é caro (~100ms+).
 * - Em caso de erro, faz fallback pra `crypto.randomUUID()` para nunca
 *   travar o fluxo do usuário. O backend só observa esse campo no MVP
 *   (não bloqueia), então a perda de fidelidade do hash é aceitável.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

/**
 * Devolve o `visitorId` do FingerprintJS (string ~22 chars).
 *
 * Concorrência: chamadas paralelas durante o primeiro load compartilham
 * a mesma promise (`inflight`) — evita inicializar o agente duas vezes.
 */
export async function obterDeviceHash(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cached = result.visitorId;
      return cached;
    } catch {
      // Fallback: nunca quebra o fluxo do usuário. UUID v4 é "device_hash"
      // suficiente pro MVP (campo de observação, não bloqueante).
      cached = fallbackHash();
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Limpa o cache em memória — útil pra tests.
 *
 * @internal
 */
export function _resetDeviceHashCache(): void {
  cached = null;
  inflight = null;
}

function fallbackHash(): string {
  // `crypto.randomUUID()` é amplamente disponível (Chrome 92+, Safari 15.4+,
  // Firefox 95+). Fallback ad-hoc para ambientes muito antigos.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Último recurso: pseudo-aleatório com timestamp + Math.random.
  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
