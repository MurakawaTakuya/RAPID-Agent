"use client";
import { InputInline } from "@/components/input-inline";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">ホーム</h1>
      </header>
      <div className="flex flex-1 items-center justify-center pb-24">
        <main className="flex flex-col items-center gap-8 w-full max-w-3xl px-4">
          <h2 className="text-2xl font-bold">Paper Agent</h2>
          <InputInline />
        </main>
      </div>
    </SidebarInset>
  );
}
