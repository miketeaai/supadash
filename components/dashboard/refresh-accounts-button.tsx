"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RefreshAccountsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/accounts/refresh", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the page data from Supabase
        router.refresh();
      } else {
        console.error("Refresh failed:", data.error);
        alert(`Refresh failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      alert("Failed to refresh accounts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isLoading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Refreshing..." : "Refresh Accounts"}
    </Button>
  );
}

