/**
 * Wrapper de `POST /api/auth/esqueci-senha` (rota nova chega na Task 8; por
 * ora segue o caminho antigo). Login, logout e sessão vivem em `SessaoContext`.
 */

import { apiFetch } from "@/lib/api"

export interface ForgotPasswordResponse {
  detail: string
}

/**
 * O backend responde SEMPRE a mesma mensagem genérica (200), exista ou não o
 * e-mail (anti-enumeração). `showToast: false` — a UI do modal exibe inline.
 */
export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>(
    "/api/customer/auth/forgot-password/",
    {
      method: "POST",
      body: JSON.stringify({ email }),
      showToast: false,
    },
  )
}
