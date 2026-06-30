"use client";

import { useState } from "react";
import { LoginPage } from "@/components/login-page";
import { ProductsDashboard } from "@/components/products-dashboard";
import { FlowsDashboard } from "@/components/flows-dashboard";
import { FlowBuilder } from "@/components/flow-builder";
import { FunctionsManagerSimple } from "@/components/functions-manager-simple";

type View = "login" | "products" | "dashboard" | "flow" | "functions";

// Dummy product name mapping
const productNames: Record<string, string> = {
  "prod-1": "Consumer Lending",
  "prod-2": "Customer Onboarding",
  "prod-3": "Fraud Prevention",
  "prod-4": "Insurance Claims",
  "prod-5": "Marketing Campaigns",
};

export default function Home() {
  const [view, setView] = useState<View>("login");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  // Login -> Products
  if (view === "login") {
    return <LoginPage onLogin={() => setView("products")} />;
  }

  // Products Dashboard
  if (view === "products") {
    return (
      <ProductsDashboard
        onSelectProduct={(productId) => {
          setSelectedProductId(productId);
          setView("dashboard");
        }}
        onLogout={() => setView("login")}
      />
    );
  }

  // Functions Manager
  if (view === "functions") {
    return <FunctionsManagerSimple onBack={() => setView("dashboard")} />;
  }

  // Flow Builder
  if (view === "flow" && selectedFlowId) {
    return (
      <div className="h-screen w-screen bg-background">
        <FlowBuilder
          flowId={selectedFlowId}
          onBack={() => {
            setSelectedFlowId(null);
            setView("dashboard");
          }}
        />
      </div>
    );
  }

  // Flows Dashboard (for selected product)
  return (
    <FlowsDashboard
      onSelectFlow={(flowId) => {
        setSelectedFlowId(flowId);
        setView("flow");
      }}
      onNavigateToFunctions={() => setView("functions")}
      onBack={() => {
        setSelectedProductId(null);
        setView("products");
      }}
      productName={
        selectedProductId
          ? (productNames[selectedProductId] ?? "Product")
          : undefined
      }
    />
  );
}
