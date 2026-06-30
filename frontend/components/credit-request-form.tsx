"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { Banknote, ShieldCheck, Send, Sparkles, BadgeCheck, CircleAlert, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { fetchEngineJson } from "../lib/engine-api"

type RequestState = "idle" | "loading" | "success" | "error"

interface CreditRequestResponse {
  flow_name?: string
  solicitud?: {
    decision?: {
      final_decision_code?: string
      blocking_rule_codes?: string[]
      required_action_codes?: string[]
    }
    observations?: Array<{
      fn_name: string
      message: string
      value?: unknown
    }>
    audit?: {
      evaluated_at?: string
    }
  }
}

interface RecommendedProduct {
  name: string
  description: string
  tag: string
}

function formatDecisionLabel(code?: string) {
  switch (code) {
    case "APPROVED":
      return "Aprobada"
    case "REJECTED":
      return "Rechazada"
    case "REQUIRE_ACTION":
      return "Requiere acción"
    case "PENDING":
    default:
      return "Pendiente"
  }
}

function getDecisionStyles(code?: string) {
  switch (code) {
    case "APPROVED":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
    case "REJECTED":
      return "border-rose-400/20 bg-rose-400/10 text-rose-100"
    case "REQUIRE_ACTION":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100"
    default:
      return "border-slate-400/20 bg-slate-400/10 text-slate-100"
  }
}

function getRecommendedProducts(code?: string): RecommendedProduct[] {
  switch (code) {
    case "APPROVED":
      return [
        {
          name: "Crédito de consumo",
          description: "Producto apto para originación inmediata con perfil favorable.",
          tag: "Originación",
        },
        {
          name: "Cuenta sueldo premium",
          description: "Paquete para capturar relación principal con el cliente.",
          tag: "Cross-sell",
        },
      ]
    case "REJECTED":
      return [
        {
          name: "Cuenta digital básica",
          description: "Mantiene relación transaccional sin riesgo crediticio adicional.",
          tag: "Bajo riesgo",
        },
        {
          name: "Educación financiera",
          description: "Recomendación comercial para reintentar más adelante.",
          tag: "Recuperación",
        },
      ]
    case "REQUIRE_ACTION":
      return [
        {
          name: "Revisión manual del ejecutivo",
          description: "Permite completar antecedentes antes de ofrecer un producto.",
          tag: "Validación",
        },
        {
          name: "Preaprobación condicionada",
          description: "Oferta diferida hasta cerrar observaciones del análisis.",
          tag: "Pendiente",
        },
      ]
    default:
      return [
        {
          name: "Evaluación comercial",
          description: "Esperando una decisión final para proponer productos.",
          tag: "Espera",
        },
      ]
  }
}

function getModelRecommendation(code?: string) {
  switch (code) {
    case "APPROVED":
      return {
        label: "Confiable",
        recommendation: "Aprobar solicitud. Cliente de bajo riesgo.",
      }
    case "REJECTED":
      return {
        label: "Moroso",
        recommendation: "Rechazar solicitud. Alto riesgo de no pago.",
      }
    case "REQUIRE_ACTION":
      return {
        label: "Comportamiento crediticio variable",
        recommendation: "Revisar manualmente. Considerar garantías adicionales.",
      }
    default:
      return {
        label: "Comportamiento crediticio variable",
        recommendation: "Revisar manualmente. Considerar garantías adicionales.",
      }
  }
}

const initialForm = {
  flujoId: "",
  ingreso_mensual: "",
  score_crediticio: "",
  monto_solicitado: "",
  antiguedad_laboral_meses: "",
  deuda_actual: "",
}

const amountFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function toNumber(value: string) {
  return Number(value.replace(",", "."))
}

function isValidPositiveNumber(value: string) {
  const parsed = toNumber(value)
  return Number.isFinite(parsed) && parsed >= 0
}

export function CreditRequestForm() {
  const [form, setForm] = useState<typeof initialForm>(initialForm)
  const [state, setState] = useState<RequestState>("idle")
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState<CreditRequestResponse | null>(null)

  const preview = useMemo(() => {
    const ingreso = isValidPositiveNumber(form.ingreso_mensual) ? toNumber(form.ingreso_mensual) : 0
    const deuda = isValidPositiveNumber(form.deuda_actual) ? toNumber(form.deuda_actual) : 0
    const monto = isValidPositiveNumber(form.monto_solicitado) ? toNumber(form.monto_solicitado) : 0

    return {
      ingreso,
      deuda,
      monto,
      ratio: ingreso > 0 ? ((deuda + monto) / ingreso) * 100 : 0,
    }
  }, [form.deuda_actual, form.ingreso_mensual, form.monto_solicitado])

  const decisionCode = response?.solicitud?.decision?.final_decision_code
  const decisionLabel = formatDecisionLabel(decisionCode)
  const decisionStyles = getDecisionStyles(decisionCode)
  const blockingRules = response?.solicitud?.decision?.blocking_rule_codes || []
  const requiredActions = response?.solicitud?.decision?.required_action_codes || []
  const latestObservation = response?.solicitud?.observations?.at(-1)
  const recommendedProducts = getRecommendedProducts(decisionCode)
  const modelRecommendation = getModelRecommendation(decisionCode)

  const handleChange = (field: keyof typeof initialForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setResponse(null)

    if (!form.flujoId.trim()) {
      setState("error")
      setMessage("Ingresa una referencia para la solicitud antes de enviar.")
      return
    }

    const ingreso = toNumber(form.ingreso_mensual)
    const score = toNumber(form.score_crediticio)
    const monto = toNumber(form.monto_solicitado)
    const antiguedad = toNumber(form.antiguedad_laboral_meses)
    const deuda = toNumber(form.deuda_actual)

    const requiredValues = [ingreso, score, monto, antiguedad, deuda]
    if (requiredValues.some((value) => !Number.isFinite(value) || value < 0)) {
      setState("error")
      setMessage("Completa todos los campos con valores numéricos válidos mayores o iguales a cero.")
      return
    }

    setState("loading")

    try {
      const payload = {
        solicitud: {
          id: `req-${Date.now()}`,
          context: {
            property_id: form.flujoId.trim(),
            monthly_rent: deuda,
            currency: "CLP",
          },
          applicants: [
            {
              id: "app-1",
              role: "TITULAR",
              income_source: {
                type: "DEPENDENT",
                dependent: {
                  payslips: Array.from({ length: 6 }, (_, index) => ({
                    month_index: index + 1,
                    net_income: ingreso,
                    period: `M${index + 1}`,
                    gross_income: ingreso,
                  })),
                },
              },
              identity: {
                full_name: "Cliente",
                document_type: "RUT",
              },
              commercial_data: {
                dicom: {
                  is_hard_debt: score < 600,
                  score,
                },
                estimated_monthly_debt_payment: deuda,
              },
            },
          ],
        },
        flow_name: "p0",
      }

      const result = await fetchEngineJson<CreditRequestResponse>(`/execute`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setResponse(result)
      setState("success")
      setMessage("Solicitud enviada correctamente al flujo seleccionado.")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la solicitud.")
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(31,41,55,0.95),_rgba(9,10,14,1)_38%,_rgba(4,7,14,1)_100%)] text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">Banco digital</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl">
                Solicitud de crédito para cliente
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Completa el formulario y envía la solicitud al motor de flujos para simular la recepción operativa desde la mesa de atención.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Seguridad</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" />Validación previa</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Canal</p>
              <p className="mt-1 text-sm font-medium text-white">POST /execute</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Estado</p>
              <p className="mt-1 text-sm font-medium text-white">{state === "loading" ? "Enviando" : state === "success" ? "Enviado" : "Borrador"}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="flujoId" className="text-sm text-slate-200">Referencia de la solicitud</Label>
                  <Input
                    id="flujoId"
                    value={form.flujoId}
                    onChange={handleChange("flujoId")}
                    placeholder="Ej. solicitud-1024"
                    autoComplete="off"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ingreso_mensual" className="text-sm text-slate-200">Ingreso mensual</Label>
                  <Input
                    id="ingreso_mensual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.ingreso_mensual}
                    onChange={handleChange("ingreso_mensual")}
                    placeholder="4500"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score_crediticio" className="text-sm text-slate-200">Score crediticio</Label>
                  <Input
                    id="score_crediticio"
                    type="number"
                    min="0"
                    step="1"
                    value={form.score_crediticio}
                    onChange={handleChange("score_crediticio")}
                    placeholder="720"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monto_solicitado" className="text-sm text-slate-200">Monto solicitado</Label>
                  <Input
                    id="monto_solicitado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto_solicitado}
                    onChange={handleChange("monto_solicitado")}
                    placeholder="12000"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="antiguedad_laboral_meses" className="text-sm text-slate-200">Antigüedad laboral en meses</Label>
                  <Input
                    id="antiguedad_laboral_meses"
                    type="number"
                    min="0"
                    step="1"
                    value={form.antiguedad_laboral_meses}
                    onChange={handleChange("antiguedad_laboral_meses")}
                    placeholder="24"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="deuda_actual" className="text-sm text-slate-200">Deuda actual</Label>
                  <Input
                    id="deuda_actual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.deuda_actual}
                    onChange={handleChange("deuda_actual")}
                    placeholder="2500"
                    className="h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    state === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  {state === "success" ? <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{message}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  La interfaz simula la carga de una solicitud de cliente en ventanilla digital.
                </div>
                <Button
                  type="submit"
                  disabled={state === "loading"}
                  className="h-11 bg-emerald-400 px-6 text-slate-950 hover:bg-emerald-300"
                >
                  {state === "loading" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviar solicitud
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-slate-950/50 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Vista previa</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Solicitud</p>
                  <p className="mt-1 text-lg font-semibold text-white">{form.flujoId || "Flujo no definido"}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ingreso mensual</p>
                    <p className="mt-1 text-lg font-semibold text-white">{amountFormatter.format(preview.ingreso || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Monto solicitado</p>
                    <p className="mt-1 text-lg font-semibold text-white">{amountFormatter.format(preview.monto || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Deuda actual</p>
                    <p className="mt-1 text-lg font-semibold text-white">{amountFormatter.format(preview.deuda || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Relación deuda/ingreso</p>
                    <p className="mt-1 text-lg font-semibold text-white">{preview.ratio.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Respuesta del motor</p>
              {response ? (
                <div className="mt-4 space-y-4">
                  <div className={`rounded-2xl border px-4 py-4 ${decisionStyles}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Decisión final</p>
                        <h3 className="mt-1 text-2xl font-semibold">{decisionLabel}</h3>
                      </div>
                      <div className="rounded-full border border-white/15 bg-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                        {decisionCode || "PENDING"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Flujo</p>
                      <p className="mt-1 text-sm font-medium text-white">{response.flow_name || "p0"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Evaluado</p>
                      <p className="mt-1 text-sm font-medium text-white">{response.solicitud?.audit?.evaluated_at || "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Observación reciente</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {latestObservation ? latestObservation.message : "Sin observaciones registradas."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reglas bloqueantes</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {blockingRules.length > 0 ? (
                          blockingRules.map((rule) => (
                            <span key={rule} className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100">
                              {rule}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-300">Ninguna</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Acciones requeridas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requiredActions.length > 0 ? (
                          requiredActions.map((action) => (
                            <span key={action} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                              {action}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-300">Ninguna</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recomendación del modelo</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{modelRecommendation.label}</p>
                        <p className="mt-1 text-sm text-slate-300">{modelRecommendation.recommendation}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                        XGBoost
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Productos recomendados</p>
                    <div className="mt-3 space-y-3">
                      {recommendedProducts.map((product) => (
                        <div key={product.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{product.name}</p>
                              <p className="mt-1 text-sm text-slate-300">{product.description}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                              {product.tag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm text-slate-300">
                  La respuesta del motor aparecerá aquí como un resumen de aprobación o rechazo.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
