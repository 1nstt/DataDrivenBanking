"use client"

import { create } from "zustand"
import { functionLibrary } from "./function-library-simple"

export { functionLibrary }

export interface FunctionDefinition {
  id: string
  name: string
  category: string
  description: string
  code: string
  updatedAt: Date
}

export const categories = [
  { id: "all", label: "All" },
  { id: "calculations", label: "Calculations" },
  { id: "rulesets", label: "Rulesets" },
  { id: "engine", label: "Engine" },
  { id: "data", label: "Data" },
  { id: "communication", label: "Communication" },
  { id: "logic", label: "Logic" },
  { id: "security", label: "Security" },
  { id: "time", label: "Time" },
  { id: "document", label: "Document" },
]

interface FunctionStore {
  functions: FunctionDefinition[]
  addFunction: (fn: Omit<FunctionDefinition, "id" | "updatedAt">) => void
  updateFunction: (id: string, updates: Partial<FunctionDefinition>) => void
  deleteFunction: (id: string) => void
  getFunction: (id: string) => FunctionDefinition | undefined
}

export const useFunctionStore = create<FunctionStore>((set, get) => ({
  functions: functionLibrary,
  addFunction: (fn) =>
    set((state) => ({
      functions: [
        ...state.functions,
        {
          ...fn,
          id: `fn_${Date.now()}`,
          updatedAt: new Date(),
        },
      ],
    })),
  updateFunction: (id, updates) =>
    set((state) => ({
      functions: state.functions.map((fn) =>
        fn.id === id ? { ...fn, ...updates, updatedAt: new Date() } : fn
      ),
    })),
  deleteFunction: (id) =>
    set((state) => ({
      functions: state.functions.filter((fn) => fn.id !== id),
    })),
  getFunction: (id) => get().functions.find((fn) => fn.id === id),
}))
