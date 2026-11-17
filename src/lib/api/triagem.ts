import { apiFetch } from "@/lib/api"

// TODO(T11): trocar pelo tipo gerado do OpenAPI
type RespostaTriagem = { risco: boolean | null }

const LIMITE_MS = 12_000

/** `POST /api/triagem`. `null` = não deu para triar (erro, 429 ou mais de 12 s): a tela segue e mostra o CVV. */
export async function triar(texto: string): Promise<boolean | null> {
  const ctl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const limite = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      ctl.abort()
      resolve(null)
    }, LIMITE_MS)
  })
  const chamada = apiFetch<RespostaTriagem>("/api/triagem", {
    method: "POST",
    body: JSON.stringify({ texto }),
    signal: ctl.signal,
    showToast: false,
  }).then(
    (r) => (typeof r?.risco === "boolean" ? r.risco : null),
    () => null,
  )
  try {
    return await Promise.race([chamada, limite])
  } finally {
    clearTimeout(timer)
  }
}
