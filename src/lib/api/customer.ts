/**
 * Wrappers de baixo nível para `/api/customer/auth/*` e `/api/customer/me/`.
 *
 * Estes wrappers usam `apiFetch` (sem injeção automática de Bearer). Para
 * chamadas autenticadas (logout, changePassword, me), os componentes devem
 * usar `useCustomerApi().customerFetch` que injeta o token do contexto.
 *
 * Os wrappers de standalone (`login`, `refresh`) são parte do auth handshake
 * — não precisam de Bearer pré-existente. As versões autenticadas
 * (`logout`, `changePassword`, `me`) recebem o token explicitamente e podem
 * ser usadas em testes ou fora de hook React.
 */

import { apiFetch } from "@/lib/api"
import { getLocale } from "@/i18n"
import type { CustomerUser } from "@/contexts/CustomerAuthContext"

const BASE_URL = import.meta.env.VITE_API_URL ?? ""

export interface LoginResponse {
  access: string
  refresh: string
  user: CustomerUser
}

export interface RefreshResponse {
  access: string
}

export interface ChangePasswordPayload {
  senha_atual: string
  nova_senha: string
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/customer/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    showToast: false,
  })
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>("/api/customer/auth/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
    showToast: false,
  })
}

export interface ForgotPasswordResponse {
  detail: string
}

/**
 * Chama `POST /api/customer/auth/forgot-password/`.
 *
 * Standalone (sem Bearer) — faz parte do fluxo de recuperação na tela de
 * login. O backend responde SEMPRE a mesma mensagem genérica (200), exista
 * ou não o e-mail (anti-enumeração). Só dá erro em 400 (formato inválido)
 * ou 429 (throttle 3/h por IP). `showToast: false` — a UI do modal exibe a
 * mensagem inline.
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

/**
 * Chama `POST /api/customer/auth/logout/` com Bearer + refresh body.
 *
 * Não usa `apiFetch` porque:
 * - precisa injetar Authorization explicitamente (logout exige `IsAuthenticated`)
 * - resposta 205 não tem body → `response.json()` quebraria
 *
 * Backend é idempotente: retorna 205 tanto pra logout válido quanto pra
 * refresh já blacklisted. Lançamos `LogoutError` apenas em 4xx/5xx genuínos
 * (network ou server-error) — o caller normalmente apenas registra no console
 * e segue limpando storage local.
 */
export class LogoutError extends Error {
  httpStatus: number
  constructor(message: string, httpStatus: number) {
    super(message)
    this.name = "LogoutError"
    this.httpStatus = httpStatus
  }
}

export async function logout(
  refreshToken: string,
  accessToken: string,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/customer/auth/logout/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Language": getLocale(),
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })
  } catch (err) {
    throw new LogoutError(
      err instanceof Error ? err.message : "network",
      0,
    )
  }

  // 205 (success or already-blacklisted, idempotent), 200, 204 → ok
  if (response.ok) {
    return
  }

  throw new LogoutError(`Logout failed: HTTP ${response.status}`, response.status)
}

export async function me(accessToken: string): Promise<CustomerUser> {
  return apiFetch<CustomerUser>("/api/customer/me/", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    showToast: false,
  })
}

export async function changePassword(
  payload: ChangePasswordPayload,
  accessToken: string,
): Promise<void> {
  await apiFetch("/api/customer/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${accessToken}` },
    showToast: false,
  })
}
