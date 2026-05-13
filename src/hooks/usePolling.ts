import { useCallback, useEffect, useRef, useState } from "react"

export type UsePollingOptions = {
  /** Intervalo base entre tentativas em ms. Default 30000 (30s). */
  intervalMs?: number
  /** Polling habilitado. Default true. */
  enabled?: boolean
  /** Pausa polling quando aba não está visível. Default true. */
  pauseWhenHidden?: boolean
  /** Sequência de backoff em ms após erros consecutivos. Default [30000, 60000, 120000]. */
  backoffSequence?: number[]
}

export type UsePollingResult<T> = {
  data: T | null
  error: unknown
  isPaused: boolean
  /** Número de erros consecutivos (zera no sucesso). */
  errorStreak: number
  /** Força um refetch imediato. */
  refetch: () => void
}

const DEFAULT_BACKOFF = [30000, 60000, 120000]

/**
 * Hook de polling resiliente — chama `fetcher` periodicamente, pausa quando aba
 * fica hidden, faz backoff exponencial em erros consecutivos.
 *
 * Reset de errorStreak em sucesso. Quando hidden, libera o timer; ao voltar pra
 * visível, refetch imediato.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: UsePollingOptions = {},
): UsePollingResult<T> {
  const {
    intervalMs = 30000,
    enabled = true,
    pauseWhenHidden = true,
    backoffSequence = DEFAULT_BACKOFF,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [errorStreak, setErrorStreak] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const timerRef = useRef<number | null>(null)
  const errorStreakRef = useRef(0)
  const isMountedRef = useRef(true)
  const reqIdRef = useRef(0)

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const computeNextDelay = useCallback(
    (streak: number): number => {
      if (streak <= 0) return intervalMs
      const idx = Math.min(streak - 1, backoffSequence.length - 1)
      return backoffSequence[idx] ?? intervalMs
    },
    [intervalMs, backoffSequence],
  )

  const runOnce = useCallback(async () => {
    const myReq = ++reqIdRef.current
    try {
      const next = await fetcherRef.current()
      if (!isMountedRef.current || myReq !== reqIdRef.current) return
      setData(next)
      setError(null)
      errorStreakRef.current = 0
      setErrorStreak(0)
    } catch (err) {
      if (!isMountedRef.current || myReq !== reqIdRef.current) return
      errorStreakRef.current += 1
      setError(err)
      setErrorStreak(errorStreakRef.current)
    }
  }, [])

  const schedule = useCallback(() => {
    clearTimer()
    if (!enabled || isPaused) return
    const delay = computeNextDelay(errorStreakRef.current)
    timerRef.current = window.setTimeout(async () => {
      await runOnce()
      schedule()
    }, delay)
  }, [enabled, isPaused, computeNextDelay, runOnce])

  // Mount: imediato + schedule. Cleanup: cancel timer.
  useEffect(() => {
    isMountedRef.current = true
    if (enabled && !isPaused) {
      runOnce().then(() => {
        if (isMountedRef.current) schedule()
      })
    }
    return () => {
      isMountedRef.current = false
      clearTimer()
    }
    // schedule é estável dado as deps internas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isPaused])

  // Pausa quando hidden
  useEffect(() => {
    if (!pauseWhenHidden) return
    function onVisibility() {
      const hidden = document.visibilityState === "hidden"
      setIsPaused(hidden)
    }
    document.addEventListener("visibilitychange", onVisibility)
    onVisibility()
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [pauseWhenHidden])

  const refetch = useCallback(() => {
    runOnce().then(() => {
      if (isMountedRef.current && enabled && !isPaused) {
        schedule()
      }
    })
  }, [runOnce, schedule, enabled, isPaused])

  return { data, error, isPaused, errorStreak, refetch }
}
