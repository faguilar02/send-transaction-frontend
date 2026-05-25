"use client"

import { useEffect, useState } from "react"
import { Pause, Play, Square } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FraudStrategy, SimulationStatus, useTransactionSimulator } from "@/hooks/use-transaction-simulator"

const STRATEGIES: { value: FraudStrategy; label: string; description: string }[] = [
  {
    value: "random",
    label: "Random",
    description: "Mezcla aleatoria de operaciones.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Mezcla equilibrada entre operaciones legítimas y sospechosas.",
  },
  {
    value: "high_fraud_bias",
    label: "High fraud bias",
    description: "Mayor presencia de operaciones sospechosas.",
  },
]

function formatStatus(status: SimulationStatus) {
  switch (status) {
    case "running":
      return "En ejecución"
    case "paused":
      return "Pausado"
    case "stopped":
      return "Detenido"
    default:
      return "Listo"
  }
}

function getStrategyDescription(strategy: FraudStrategy) {
  return STRATEGIES.find((item) => item.value === strategy)?.description ?? ""
}

export function TransactionSimulator() {
  const [now, setNow] = useState(() => Date.now())
  const {
    state,
    configIssue,
    updateConfig,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
  } = useTransactionSimulator()

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  const statusLabel = formatStatus(state.status)
  const selectedStrategyDescription = getStrategyDescription(state.config.strategy)
  const isRunning = state.status === "running"
  const isPaused = state.status === "paused"
  const canPause = state.status === "running"
  const canResume = state.status === "paused"
  const canStop = state.status !== "idle"
  const amountLabel = state.config.randomizeVolume ? "entre" : "aproximadamente"

  const summary =
    state.status === "running"
      ? state.config.randomizeVolume
        ? `Se enviarán ${amountLabel} ${state.config.minSampleSize} y ${state.config.maxSampleSize} transacciones cada ${state.config.intervalSeconds} segundos en modo ${state.config.strategy}.`
        : `Se enviarán aproximadamente ${state.config.fixedSampleSize} transacciones cada ${state.config.intervalSeconds} segundos en modo ${state.config.strategy}.`
      : state.status === "paused"
        ? "La simulación está pausada. Al reanudar, continuará con la misma configuración."
        : state.status === "stopped"
          ? "La simulación está detenida y no se están enviando transacciones."
          : state.config.randomizeVolume
            ? `Se enviarán entre ${state.config.minSampleSize} y ${state.config.maxSampleSize} transacciones cada ${state.config.intervalSeconds} segundos en modo ${state.config.strategy}.`
            : `Se enviarán aproximadamente ${state.config.fixedSampleSize} transacciones cada ${state.config.intervalSeconds} segundos en modo ${state.config.strategy}.`

  const intervalPresets = [5, 10, 15]

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] px-4 py-8 text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,_#09111f_0%,_#0d1728_100%)] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <Card className="w-full border-slate-200/80 bg-card/90 shadow-2xl backdrop-blur dark:border-slate-800/80">
          <CardHeader className="space-y-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Demo académica
              </Badge>
            </div>
            <CardTitle className="text-3xl tracking-tight sm:text-4xl">Simulador de Transacciones</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Ajusta lo esencial y deja que la simulación envíe transacciones automáticamente.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Estado:</span>
              <Badge variant={state.status === "running" ? "default" : state.status === "paused" ? "secondary" : "outline"}>
                {statusLabel}
              </Badge>
              {state.isRequestInFlight ? <Badge variant="secondary">Procesando</Badge> : null}
            </div>

            <div className="grid gap-5">
              <section className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="intervalSeconds">Cada cuánto tiempo</Label>
                    <div className="flex gap-2">
                      {intervalPresets.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant={state.config.intervalSeconds === preset ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateConfig({ intervalSeconds: preset })}
                        >
                          {preset}s
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="intervalSeconds"
                    type="number"
                    min={5}
                    max={3600}
                    step={1}
                    value={state.config.intervalSeconds}
                    onChange={(event) => updateConfig({ intervalSeconds: Number(event.target.value) || 0 })}
                  />
                  <p className="text-sm text-muted-foreground">Elige un ritmo simple para la simulación.</p>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="randomizeVolume" className="text-base">
                        Variar cantidad por ciclo
                      </Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Actívalo para usar un rango o desactívalo para mantener un valor fijo.
                      </p>
                    </div>
                    <Checkbox
                      id="randomizeVolume"
                      checked={state.config.randomizeVolume}
                      onCheckedChange={(checked) => updateConfig({ randomizeVolume: checked === true })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {state.config.randomizeVolume ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="minSampleSize">Mínimo por ciclo</Label>
                          <Input
                            id="minSampleSize"
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            value={state.config.minSampleSize}
                            onChange={(event) => updateConfig({ minSampleSize: Number(event.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxSampleSize">Máximo por ciclo</Label>
                          <Input
                            id="maxSampleSize"
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            value={state.config.maxSampleSize}
                            onChange={(event) => updateConfig({ maxSampleSize: Number(event.target.value) || 0 })}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="fixedSampleSize">Cantidad por ciclo</Label>
                        <Input
                          id="fixedSampleSize"
                          type="number"
                          min={1}
                          max={10000}
                          step={1}
                          value={state.config.fixedSampleSize}
                          onChange={(event) => updateConfig({ fixedSampleSize: Number(event.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Estrategia de simulación</Label>
                  <select
                    id="strategy"
                    value={state.config.strategy}
                    onChange={(event) => updateConfig({ strategy: event.target.value as FraudStrategy })}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {STRATEGIES.map((strategy) => (
                      <option key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">{selectedStrategyDescription}</p>
                </div>
              </section>

              <section className="flex flex-wrap gap-3">
                {isPaused ? (
                  <Button onClick={resumeSimulation} className="gap-2">
                    <Play className="size-4" />
                    Reanudar simulación
                  </Button>
                ) : (
                  <Button onClick={startSimulation} disabled={isRunning && state.isRequestInFlight} className="gap-2">
                    <Play className="size-4" />
                    Iniciar simulación
                  </Button>
                )}

                <Button onClick={pauseSimulation} variant="outline" disabled={!canPause} className="gap-2">
                  <Pause className="size-4" />
                  Pausar
                </Button>

                <Button onClick={() => stopSimulation()} variant="destructive" disabled={!canStop} className="gap-2">
                  <Square className="size-4" />
                  Detener
                </Button>
              </section>

              <section className="rounded-2xl bg-slate-950 px-4 py-4 text-sm leading-6 text-slate-100 shadow-sm dark:bg-slate-900">
                <p className="font-medium text-white">Resumen</p>
                <p className="mt-2 text-slate-200">{summary}</p>
                {state.lastError ? <p className="mt-3 text-amber-300">{state.lastError}</p> : null}
              </section>

              <section className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {state.status === "running"
                    ? `La simulación está activa desde ${new Intl.DateTimeFormat("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).format(new Date(now))}.`
                    : state.status === "paused"
                      ? "La simulación está pausada. Al reanudar, continuará con la misma configuración."
                      : state.status === "stopped"
                        ? "La simulación está detenida y no se están enviando transacciones."
                        : "Configura la simulación y presiona iniciar para comenzar."}
                </p>
                <p>
                  Estrategia actual: <span className="font-medium text-foreground">{selectedStrategyDescription}</span>
                </p>
                {configIssue ? <p className="text-destructive">{configIssue}</p> : null}
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
