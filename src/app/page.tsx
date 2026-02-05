"use client";
import { InputInline } from "@/components/input-inline";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import styles from "./page.module.scss";

export default function Home() {
  const { user } = useAuth();

  useEffect(() => {
    const checkCloudRun = async () => {
      if (!user) return;

      try {
        console.log("Fetching Cloud Run API...");
        const token = await user.getIdToken();
        const res = await fetch("/api/cloud-run", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("☁️ Cloud Run Response:", data);
      } catch (err) {
        console.error("Cloud Run Error:", err);
      }
    };

    checkCloudRun();
  }, [user]);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">ホーム</h1>
      </header>
      <div className={styles.page}>
        <main className={styles.main}>
          <div className="flex flex-col items-center gap-8 w-full">
            <h2 className="text-2xl font-bold">Paper Agent</h2>
            <InputInline />
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}
