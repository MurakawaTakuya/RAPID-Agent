"use client";
import { InputInline } from "@/components/input-inline";
import { Introduction } from "@/components/introduction";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Introduction />;
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <div className="flex flex-1 items-center justify-center pb-24">
        <main className="flex flex-col items-center gap-8 w-full max-w-7xl px-4">
          <h2 className="text-2xl font-bold">どの学会や論文を検索しますか?</h2>
          <InputInline />
        </main>
      </div>
    </SidebarInset>
  );
}
