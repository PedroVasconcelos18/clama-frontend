/**
 * Wrapper de `POST /api/auth/esqueci-senha`. Login, logout e sessão vivem em `SessaoContext`.
 */

import { apiFetch } from "@/lib/api"

/**
 * O backend responde SEMPRE 200 genérico, exista ou não o e-mail
 * (anti-enumeração). `showToast: false` — a UI do modal exibe inline.
 */
export async function forgotPassword(email: string): Promise<void> {
  await apiFetch("/api/auth/esqueci-senha", {
    method: "POST",
    body: JSON.stringify({ email }),
    showToast: false,
  })
}
