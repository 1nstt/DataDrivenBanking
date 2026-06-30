"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Plus, Search, Save, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { CodeEditor } from "./code-editor"
import { categories, useFunctionStore } from "@/lib/function-store"
import { fetchEngineJson } from "@/lib/engine-api"

interface FunctionsManagerSimpleProps {
  onBack: () => void
}

export function FunctionsManagerSimple({ onBack }: FunctionsManagerSimpleProps) {
  const functions = useFunctionStore((state) => state.functions)
  const addFunction = useFunctionStore((state) => state.addFunction)
  const updateFunction = useFunctionStore((state) => state.updateFunction)
  const deleteFunction = useFunctionStore((state) => state.deleteFunction)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedFunctionId, setSelectedFunctionId] = useState(functions[0]?.id ?? "")
  const [editedName, setEditedName] = useState(functions[0]?.name ?? "")
  const [editedDescription, setEditedDescription] = useState(functions[0]?.description ?? "")
  const [editedCategory, setEditedCategory] = useState(functions[0]?.category ?? "calculations")
  const [editedCode, setEditedCode] = useState(functions[0]?.code ?? "")
  const [newFunctionName, setNewFunctionName] = useState("")
  const [newFunctionDescription, setNewFunctionDescription] = useState("")
  const [newFunctionCategory, setNewFunctionCategory] = useState("calculations")

  const syncFunction = async (functionName: string, payload: { label: string; category: string; description: string; code: string }) => {
    await fetchEngineJson(`/functions/${encodeURIComponent(functionName)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  }

  const filteredFunctions = useMemo(() => {
    return functions.filter((fn) => {
      const matchesSearch =
        fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fn.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || fn.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [functions, searchQuery, selectedCategory])

  const selectedFunction = functions.find((fn) => fn.id === selectedFunctionId) ?? null

  const handleSelectFunction = (functionId: string) => {
    const fn = functions.find((item) => item.id === functionId)
    if (!fn) return

    setSelectedFunctionId(fn.id)
    setEditedName(fn.name)
    setEditedDescription(fn.description)
    setEditedCategory(fn.category)
    setEditedCode(fn.code)
  }

  const handleSave = () => {
    if (!selectedFunction) return

    void syncFunction(selectedFunction.id, {
      label: editedName.trim(),
      category: editedCategory,
      description: editedDescription.trim(),
      code: editedCode,
    })

    updateFunction(selectedFunction.id, {
      name: editedName.trim(),
      description: editedDescription.trim(),
      category: editedCategory,
      code: editedCode,
    })
  }

  const handleCreate = () => {
    if (!newFunctionName.trim()) return

    const functionName = newFunctionName.trim().replace(/\s+/g, "_").toLowerCase()
    const initialCode = `def ${functionName}(motor):\n    pass`

    void syncFunction(functionName, {
      label: newFunctionName.trim(),
      category: newFunctionCategory,
      description: newFunctionDescription.trim() || "New function",
      code: initialCode,
    })

    addFunction({
      id: functionName,
      name: newFunctionName.trim(),
      description: newFunctionDescription.trim() || "New function",
      category: newFunctionCategory,
      code: initialCode,
    })

    setNewFunctionName("")
    setNewFunctionDescription("")
    setNewFunctionCategory("calculations")
  }

  const handleDelete = () => {
    if (!selectedFunction) return
    if (!confirm(`Delete ${selectedFunction.name}?`)) return

    deleteFunction(selectedFunction.id)
    const nextFunction = functions.find((fn) => fn.id !== selectedFunction.id)
    if (nextFunction) {
      handleSelectFunction(nextFunction.id)
    } else {
      setSelectedFunctionId("")
      setEditedName("")
      setEditedDescription("")
      setEditedCategory("calculations")
      setEditedCode("")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Functions</h1>
              <p className="text-sm text-muted-foreground">Edit calculations, rulesets, and engine helpers directly</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={!selectedFunction}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <Card className="border-border bg-card p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search functions..." className="pl-9" />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="mb-3">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-2">
            {filteredFunctions.map((fn) => (
              <button
                key={fn.id}
                type="button"
                onClick={() => handleSelectFunction(fn.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedFunctionId === fn.id ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted"
                }`}
              >
                <div className="text-sm font-medium text-foreground">{fn.name}</div>
                <div className="text-xs text-muted-foreground">{fn.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">New function</h2>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-function-name">Name</Label>
                <Input id="new-function-name" value={newFunctionName} onChange={(e) => setNewFunctionName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-function-description">Description</Label>
                <Textarea id="new-function-description" value={newFunctionDescription} onChange={(e) => setNewFunctionDescription(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-function-category">Category</Label>
                <Select value={newFunctionCategory} onValueChange={setNewFunctionCategory}>
                  <SelectTrigger id="new-function-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((item) => item.id !== "all").map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card p-4">
          {selectedFunction ? (
            <div className="grid h-full gap-4 lg:grid-rows-[auto_auto_1fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="function-name">Function name</Label>
                  <Input id="function-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="function-category">Category</Label>
                  <Select value={editedCategory} onValueChange={setEditedCategory}>
                    <SelectTrigger id="function-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter((item) => item.id !== "all").map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="function-description">Description</Label>
                  <Textarea id="function-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Code</h2>
                <Button variant="outline" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>

              <div className="min-h-[520px] overflow-hidden rounded-lg border border-border">
                <CodeEditor value={editedCode} onChange={setEditedCode} language="python" />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a function to edit it.
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}