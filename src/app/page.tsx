"use client";
import { InputInline, SearchResult } from "@/components/input-inline";
import { Introduction } from "@/components/introduction";
import { SearchStepper } from "@/components/search-stepper";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Introduction />;
  }

  const handleNext = () => {
    if (
      currentStep === 1 &&
      searchResult?.papers &&
      searchResult.papers.length > 0
    ) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center px-4 mb-5 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b justify-between">
        <div className="flex items-center gap-2 w-[120px]">
          <SidebarTrigger className="-ml-1" />
        </div>

        <div className="flex-1 flex justify-center h-full items-center">
          <SearchStepper currentStep={currentStep} />
        </div>

        <div className="flex items-center justify-end gap-2 w-[120px]">
          <AnimatedThemeToggler />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center pb-24 overflow-hidden w-full relative">
        {/* Navigation Buttons */}
        <div className="absolute top-0 left-4 z-20">
          <AnimatePresence>
            {currentStep > 1 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" />
                  検索し直す
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-0 right-4 z-20">
          <AnimatePresence>
            {currentStep === 1 &&
              searchResult?.papers &&
              searchResult.papers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <Button onClick={handleNext} className="gap-1">
                    グループ化する
                    <ChevronRight className="size-4" />
                  </Button>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.main
              key="step1"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 w-full max-w-7xl px-4"
            >
              <h2 className="text-2xl font-bold mt-3">
                興味のある論文を検索しましょう
              </h2>
              <InputInline
                result={searchResult}
                onResultChange={setSearchResult}
              />
            </motion.main>
          )}

          {currentStep === 2 && (
            <motion.main
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 w-full max-w-7xl px-4"
            >
              <h2 className="text-2xl font-bold">Search Selection Confirmed</h2>
              <div className="p-8 border rounded-lg bg-card w-full max-w-3xl">
                <p>Selected {searchResult?.papers.length} papers.</p>
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
