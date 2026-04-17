"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    // Clear the dashboard access cookie
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.push("/dashboard-login");
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  );
}
