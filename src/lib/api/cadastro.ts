import { apiFetch } from "@/lib/api"
import type { components } from "@/types/api-schema"

type CadastroResposta = components["schemas"]["MensagemPastoral"]

/**
 * `POST /api/auth/cadastro` (anônimo, CSRF, Turnstile). A API responde sempre a mesma mensagem pastoral,
 * exista ou não conta com o e-mail (anti-enumeração); a tela só a repete.
 */
export async function cadastrar(nome: string, email: string, turnstileToken: string): Promise<string> {
  const r = await apiFetch<CadastroResposta>("/api/auth/cadastro", {
    method: "POST",
    body: JSON.stringify({ nome, email, turnstileToken }),
    showToast: false,
  })
  return r.mensagemPastoral ?? ""
}
