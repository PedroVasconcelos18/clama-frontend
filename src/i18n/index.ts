import { ptBR } from "./locales/pt-BR"
import { en } from "./locales/en"

export type Locale = "pt-BR" | "en"

const locales = {
  "pt-BR": ptBR,
  en: en,
} as const

type Translations = typeof ptBR

let currentLocale: Locale = "pt-BR"

/**
 * Define o idioma atual da aplicação e salva no localStorage.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale
  localStorage.setItem("locale", locale)
}

/**
 * Retorna o idioma atual.
 */
export function getLocale(): Locale {
  return currentLocale
}

/**
 * Detecta o idioma preferido do navegador e configura automaticamente.
 * Para esta aplicação brasileira, usa pt-BR como padrão.
 * Só usa inglês se o navegador estiver explicitamente em inglês E não tiver português.
 */
export function detectLocale(): Locale {
  // Verifica se há preferência salva no localStorage
  const saved = localStorage.getItem("locale") as Locale | null
  if (saved && (saved === "pt-BR" || saved === "en")) {
    currentLocale = saved
    return currentLocale
  }

  // Para aplicação brasileira, pt-BR é o padrão
  currentLocale = "pt-BR"
  return currentLocale
}

/**
 * Retorna as traduções para o idioma atual.
 */
export function getTranslations(): Translations {
  return locales[currentLocale]
}

/**
 * Traduz uma mensagem de erro do backend.
 * Procura por correspondências parciais nas mensagens de validação.
 */
export function translateError(message: string): string {
  const t = getTranslations()
  const validations = t.errors.validation

  // Procura correspondência exata primeiro
  if (message in validations) {
    return validations[message as keyof typeof validations]
  }

  // Procura correspondências parciais (para mensagens com valores dinâmicos)
  let translated = message
  for (const [key, value] of Object.entries(validations)) {
    if (message.includes(key)) {
      translated = translated.replace(key, value)
    }
  }

  return translated
}

/**
 * Retorna uma mensagem de erro genérica traduzida.
 */
export function getGenericError(): string {
  return getTranslations().errors.generic
}

/**
 * Retorna a mensagem de erro de rede traduzida.
 */
export function getNetworkError(): string {
  return getTranslations().errors.networkError
}

/**
 * Retorna a mensagem de sessão expirada traduzida.
 */
export function getSessionExpiredError(): string {
  return getTranslations().errors.sessionExpired
}
