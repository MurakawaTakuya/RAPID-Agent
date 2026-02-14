"use client";
import { InputInline } from "@/components/input-inline";
import { Introduction } from "@/components/introduction";
import { Paper } from "@/components/papers-table";
import { SearchStepper } from "@/components/search-stepper";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedData, setSelectedData] = useState<{ papers: Paper[] } | null>(
    null
  );

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Introduction />;
  }

  const handleNext = (data: { papers: Paper[] }) => {
    setSelectedData(data);
    setCurrentStep(2);
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 mb-8 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1 flex justify-center h-full items-center">
          <SearchStepper currentStep={currentStep} />
        </div>
        <AnimatedThemeToggler className="ml-auto" />
      </header>
      <div className="flex flex-1 items-center justify-center pb-24 overflow-hidden w-full">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.main
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 w-full max-w-7xl px-4"
            >
              <h2 className="text-2xl font-bold">
                どの学会や論文を検索しますか?
              </h2>
              <InputInline onNext={handleNext} />
            </motion.main>
          )}

          {currentStep === 2 && (
            <motion.main
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 w-full max-w-7xl px-4"
            >
              <h2 className="text-2xl font-bold">Search Selection Confirmed</h2>
              <div className="p-8 border rounded-lg bg-card">
                <p>Selected {selectedData?.papers.length} papers.</p>
                {/* Placeholder for Next Step content */}
                <div className="mt-4">
                  <p className="text-muted-foreground">
                    Next screen content goes here...
                  </p>
                </div>
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </SidebarInset>
  );
}
