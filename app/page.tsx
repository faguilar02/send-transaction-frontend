"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Send, AlertCircle } from "lucide-react"

const PRESET_AMOUNTS = [10, 30, 50, 100, 200]

type Strategy = "random" | "balanced" | "high_fraud_bias"

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "random", label: "Random" },
  { value: "high_fraud_bias", label: "High Fraud Bias" },
]

export default function TransactionPage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [strategy, setStrategy] = useState<Strategy>("balanced")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const transactionCount = selectedAmount || (customAmount ? Number.parseInt(customAmount) : null)
  const isValidRange = transactionCount && transactionCount >= 10 && transactionCount <= 1000
  const showRangeError = transactionCount !== null && !isValidRange

  const handleSendTransactions = async () => {
    if (!isValidRange) return

    setIsLoading(true)
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "user123"
    const endpoint = `${API_URL}/api/fraud/predict/batch`
    
    const requestBody = {
      sample_size: transactionCount,
      strategy: strategy,
    }
    
    console.log("🚀 Enviando petición al backend...")
    console.log("📦 Request Body:", requestBody)
    console.log("🔗 URL:", endpoint)
    console.log("👤 User ID:", USER_ID)
    
    try {
      // Timeout de 30 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      console.log("⏳ Esperando respuesta del servidor...")
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": USER_ID,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      console.log("📡 Respuesta recibida - Status:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Error del servidor:", errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }
        
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Respuesta exitosa:", data)

      toast({
        title: "✓ Job creado exitosamente",
        description: `Job ID: ${data.job_id} | Status: ${data.status}`,
      })

      setSelectedAmount(null)
      setCustomAmount("")
      setStrategy("balanced")
    } catch (error) {
      console.error("❌ Error completo:", error)
      
      let errorMessage = "No se pudo conectar con el servidor"
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "La petición tardó demasiado (timeout 30s)"
        } else if (error.message.includes("fetch")) {
          errorMessage = `No se pudo conectar con ${API_URL} - ¿Está el backend corriendo?`
        } else {
          errorMessage = error.message
        }
      }
      
      console.error("💬 Mensaje de error:", errorMessage)
      
      toast({
        variant: "destructive",
        title: "Error al crear job",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
      console.log("🏁 Proceso finalizado")
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-foreground mb-8">Crear Job de Análisis de Fraude</h1>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-4">Sample Size</label>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setSelectedAmount(amt)
                    setCustomAmount("")
                  }}
                  className={`py-3 px-2 rounded-lg font-semibold transition-all text-sm ${
                    selectedAmount === amt
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            <Input
              type="number"
              placeholder="Cantidad personalizada (10-1000)"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              className="h-11 text-base"
              min="10"
              max="1000"
            />

            {showRangeError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>La cantidad debe estar entre 10 y 1000</span>
              </div>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-3">Estrategia</label>
            <Select value={strategy} onValueChange={(value) => setStrategy(value as Strategy)}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Selecciona estrategia" />
              </SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((strat) => (
                  <SelectItem key={strat.value} value={strat.value}>
                    {strat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSendTransactions}
            disabled={!isValidRange || isLoading}
            className="w-full h-11 text-base font-semibold gap-2"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Creando job..." : "Crear Job"}
          </Button>
        </div>
      </Card>
    </main>
  )
}
