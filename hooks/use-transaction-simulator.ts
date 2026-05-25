"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const API_URL = "https://models-api-fraud.chiqo.site/api"
const SIMULATION_ENDPOINT = `${API_URL}/fraud/predict/batch`
const MIN_SAFE_INTERVAL_SECONDS = 5
const MAX_INTERVAL_SECONDS = 3600
const MIN_SAMPLE_SIZE = 1
const MAX_SAMPLE_SIZE = 10000
const MAX_LOG_ENTRIES = 12

export type SimulationStatus = "idle" | "running" | "paused" | "stopped"

export type FraudStrategy = "random" | "balanced" | "high_fraud_bias"

export interface TransactionSimulatorConfig {
  intervalSeconds: number
  randomizeVolume: boolean
  fixedSampleSize: number
  minSampleSize: number
  maxSampleSize: number
  strategy: FraudStrategy
}

export interface BatchJobResponse {
  job_id: string
  status: string
  message: string
  estimate_seconds: number
}

export interface SimulatorLogEntry {
  id: string
  type: "info" | "success" | "warning" | "error"
  title: string
  detail: string
  timestamp: number
  sampleSize?: number
  jobId?: string | null
}

export interface TransactionSimulatorState {
  status: SimulationStatus
  isRequestInFlight: boolean
  config: TransactionSimulatorConfig
  totalJobsSent: number
  totalEstimatedTransactions: number
  lastJobId: string | null
  lastSentAt: number | null
  lastCompletedAt: number | null
  nextSendAt: number | null
  recentLogs: SimulatorLogEntry[]
  lastError: string | null
}

const DEFAULT_CONFIG: TransactionSimulatorConfig = {
  intervalSeconds: 12,
  randomizeVolume: true,
  fixedSampleSize: 250,
  minSampleSize: 100,
  maxSampleSize: 500,
  strategy: "balanced",
}

function generateSampleSize(minSampleSize: number, maxSampleSize: number) {
  if (maxSampleSize <= minSampleSize) {
    return minSampleSize
  }

  return Math.floor(Math.random() * (maxSampleSize - minSampleSize + 1)) + minSampleSize
}

function createLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function formatResponseError(responseStatus: number, responseStatusText: string, detail: string) {
  const suffix = detail ? ` - ${detail}` : ""
  return `Error ${responseStatus}${responseStatusText ? ` ${responseStatusText}` : ""}${suffix}`
}

function parseUnknownError(error: unknown, endpoint: string) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "La solicitud activa fue cancelada."
    }

    if (error.message.includes("fetch")) {
      return `No se pudo conectar con el backend en ${endpoint}.`
    }

    return error.message
  }

  return "No se pudo completar la solicitud."
}

function validateConfig(config: TransactionSimulatorConfig) {
  if (config.intervalSeconds < MIN_SAFE_INTERVAL_SECONDS) {
    return `El intervalo mínimo seguro es de ${MIN_SAFE_INTERVAL_SECONDS} segundos.`
  }

  if (config.intervalSeconds > MAX_INTERVAL_SECONDS) {
    return `El intervalo máximo permitido es de ${MAX_INTERVAL_SECONDS} segundos.`
  }

  if (config.randomizeVolume) {
    if (config.minSampleSize < MIN_SAMPLE_SIZE) {
      return `El mínimo por ciclo debe ser al menos ${MIN_SAMPLE_SIZE}.`
    }

    if (config.maxSampleSize > MAX_SAMPLE_SIZE) {
      return `El máximo por ciclo no puede superar ${MAX_SAMPLE_SIZE}.`
    }

    if (config.minSampleSize > config.maxSampleSize) {
      return "El mínimo por ciclo no puede ser mayor que el máximo."
    }

    return null
  }

  if (config.fixedSampleSize < MIN_SAMPLE_SIZE || config.fixedSampleSize > MAX_SAMPLE_SIZE) {
    return `El volumen fijo debe estar entre ${MIN_SAMPLE_SIZE} y ${MAX_SAMPLE_SIZE}.`
  }

  return null
}

export function useTransactionSimulator() {
  const [config, setConfig] = useState<TransactionSimulatorConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<SimulationStatus>("idle")
  const [isRequestInFlight, setIsRequestInFlight] = useState(false)
  const [totalJobsSent, setTotalJobsSent] = useState(0)
  const [totalEstimatedTransactions, setTotalEstimatedTransactions] = useState(0)
  const [lastJobId, setLastJobId] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)
  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null)
  const [nextSendAt, setNextSendAt] = useState<number | null>(null)
  const [recentLogs, setRecentLogs] = useState<SimulatorLogEntry[]>([])
  const [lastError, setLastError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const requestInFlightRef = useRef(false)
  const statusRef = useRef<SimulationStatus>(status)
  const configRef = useRef(config)
  const abortReasonRef = useRef<"stop" | "cleanup" | null>(null)
  const runCycleRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    configRef.current = config
  }, [config])

  const appendLog = useCallback((entry: Omit<SimulatorLogEntry, "id" | "timestamp">) => {
    const timestamp = Date.now()

    setRecentLogs((currentLogs) => [
      {
        id: createLogId(),
        timestamp,
        ...entry,
      },
      ...currentLogs,
    ].slice(0, MAX_LOG_ENTRIES))
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNextCycle = useCallback(() => {
    if (statusRef.current !== "running") {
      return
    }

    clearTimer()

    const intervalMs = configRef.current.intervalSeconds * 1000
    const scheduledAt = Date.now() + intervalMs

    setNextSendAt(scheduledAt)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void runCycleRef.current()
    }, intervalMs)
  }, [clearTimer])

  const abortActiveRequest = useCallback((reason: "stop" | "cleanup") => {
    abortReasonRef.current = reason

    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }

    requestInFlightRef.current = false
    setIsRequestInFlight(false)
  }, [])

  const runCycle = useCallback(async () => {
    if (requestInFlightRef.current || statusRef.current !== "running") {
      return
    }

    const currentConfig = configRef.current
    const configIssue = validateConfig(currentConfig)

    if (configIssue) {
      clearTimer()
      setNextSendAt(null)
      setStatus("stopped")
      statusRef.current = "stopped"
      setLastError(configIssue)
      appendLog({
        type: "error",
        title: "Configuración inválida",
        detail: configIssue,
      })
      return
    }

    clearTimer()
    setNextSendAt(null)
    setIsRequestInFlight(true)
    requestInFlightRef.current = true

    const sampleSize = currentConfig.randomizeVolume
      ? generateSampleSize(currentConfig.minSampleSize, currentConfig.maxSampleSize)
      : currentConfig.fixedSampleSize

    const requestBody = {
      sample_size: sampleSize,
      strategy: currentConfig.strategy,
      random_seed: Date.now(),
    }

    const controller = new AbortController()
    controllerRef.current = controller

    const startedAt = Date.now()
    setLastSentAt(startedAt)
    setLastError(null)

    appendLog({
      type: "info",
      title: "Envío iniciado",
      detail: `POST ${SIMULATION_ENDPOINT} con ${sampleSize} transacciones simuladas.`,
      sampleSize,
    })

    try {
      const response = await fetch(SIMULATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok) {
        const responseText = await response.text()
        let detail = responseText

        try {
          const parsed = JSON.parse(responseText) as { message?: string }
          detail = parsed.message || responseText
        } catch {
          detail = responseText
        }

        throw new Error(formatResponseError(response.status, response.statusText, detail))
      }

      const responseData = (await response.json()) as BatchJobResponse

      setTotalJobsSent((currentTotal) => currentTotal + 1)
      setTotalEstimatedTransactions((currentTotal) => currentTotal + sampleSize)
      setLastJobId(responseData.job_id)
      setLastCompletedAt(Date.now())

      appendLog({
        type: "success",
        title: "Job encolado",
        detail: `${responseData.status} | ${responseData.message}`,
        sampleSize,
        jobId: responseData.job_id,
      })
    } catch (error) {
      const message = parseUnknownError(error, SIMULATION_ENDPOINT)

      setLastCompletedAt(Date.now())

      if ((error instanceof Error && error.name === "AbortError") && abortReasonRef.current) {
        appendLog({
          type: "warning",
          title: "Solicitud cancelada",
          detail: abortReasonRef.current === "stop"
            ? "La simulación se detuvo y la solicitud en curso fue cancelada."
            : "El componente se desmontó y la solicitud fue cancelada.",
          sampleSize,
        })
      } else {
        setLastError(message)
        appendLog({
          type: "error",
          title: "Error en el envío",
          detail: message,
          sampleSize,
        })
      }
    } finally {
      requestInFlightRef.current = false
      controllerRef.current = null
      setIsRequestInFlight(false)

      const shouldContinue = statusRef.current === "running"

      if (abortReasonRef.current) {
        abortReasonRef.current = null
      }

      if (shouldContinue) {
        scheduleNextCycle()
      } else {
        setNextSendAt(null)
      }
    }
  }, [appendLog, clearTimer, scheduleNextCycle])

  useEffect(() => {
    runCycleRef.current = runCycle
  }, [runCycle])

  const startSimulation = useCallback(() => {
    const configIssue = validateConfig(configRef.current)
    const wasPaused = statusRef.current === "paused"

    if (configIssue) {
      setLastError(configIssue)
      appendLog({
        type: "error",
        title: "No se puede iniciar",
        detail: configIssue,
      })
      return
    }

    if (statusRef.current === "running") {
      return
    }

    setStatus("running")
    statusRef.current = "running"
    setLastError(null)
    appendLog({
      type: "info",
      title: wasPaused ? "Simulación reanudada" : "Simulación iniciada",
      detail: "El simulador comenzará a enviar ciclos de operaciones de caja municipal.",
    })

    scheduleNextCycle()
  }, [appendLog, scheduleNextCycle])

  const pauseSimulation = useCallback(() => {
    if (statusRef.current !== "running") {
      return
    }

    clearTimer()
    setStatus("paused")
    statusRef.current = "paused"
    setNextSendAt(null)
    appendLog({
      type: "warning",
      title: "Simulación en pausa",
      detail: "Se detuvo la programación de nuevos envíos sin perder la configuración actual.",
    })
  }, [appendLog, clearTimer])

  const resumeSimulation = useCallback(() => {
    if (statusRef.current !== "paused") {
      return
    }

    startSimulation()
  }, [startSimulation])

  const stopSimulation = useCallback((options?: { resetMetrics?: boolean }) => {
    const resetMetrics = Boolean(options?.resetMetrics)

    clearTimer()
    abortActiveRequest("stop")
    setStatus("stopped")
  statusRef.current = "stopped"
    setNextSendAt(null)

    if (resetMetrics) {
      setTotalJobsSent(0)
      setTotalEstimatedTransactions(0)
      setLastJobId(null)
      setLastSentAt(null)
      setLastCompletedAt(null)
      setRecentLogs([])
      setLastError(null)
    }

    appendLog({
      type: "info",
      title: resetMetrics ? "Simulación detenida y métricas reiniciadas" : "Simulación detenida",
      detail: "No quedan intervalos activos ni solicitudes pendientes.",
    })
  }, [abortActiveRequest, appendLog, clearTimer])

  const resetSessionMetrics = useCallback(() => {
    setTotalJobsSent(0)
    setTotalEstimatedTransactions(0)
    setLastJobId(null)
    setLastSentAt(null)
    setLastCompletedAt(null)
    setRecentLogs([])
    setLastError(null)
  }, [])

  const updateConfig = useCallback((patch: Partial<TransactionSimulatorConfig>) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      ...patch,
    }))
  }, [])

  const configIssue = useMemo(() => validateConfig(config), [config])

  useEffect(() => {
    return () => {
      clearTimer()
      abortActiveRequest("cleanup")
    }
  }, [abortActiveRequest, clearTimer])

  return {
    state: {
      status,
      isRequestInFlight,
      config,
      totalJobsSent,
      totalEstimatedTransactions,
      lastJobId,
      lastSentAt,
      lastCompletedAt,
      nextSendAt,
      recentLogs,
      lastError,
    } satisfies TransactionSimulatorState,
    configIssue,
    updateConfig,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSessionMetrics,
  }
}
