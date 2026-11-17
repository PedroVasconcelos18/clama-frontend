import { apiFetch } from "@/lib/api"

// TODO(T11): trocar pelo tipo gerado do OpenAPI
type RespostaTriagem = { risco: boolean | null }

/** `POST /api/triagem`. `null` = não deu para triar (qualquer erro, 429 incluído): a tela mostra o CVV. */
export async function triar(texto: string): Promise<boolean | null> {
  try {
    const r = await apiFetch<RespostaTriagem>("/api/triagem", {
      method: "POST",
      body: JSON.stringify({ texto }),
      showToast: false,
    })
    return typeof r?.risco === "boolean" ? r.risco : null
  } catch {
    return null
  }
}
