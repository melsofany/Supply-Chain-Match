import React from "react";
import { Sidebar } from "./sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
