"use client";
import { CategorizationResults } from "@/components/categorization-results";
import {
  CategorizationInfo,
  CategorizationStep,
} from "@/components/categorization-step";
import { InputInline, SearchResult } from "@/components/input-inline";
import { Introduction } from "@/components/introduction";
import { Paper } from "@/components/papers-table";
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
  const [direction, setDirection] = useState(0);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Categorization state
  const [categorizationInput, setCategorizationInput] = useState("");
  const [categorizationInfo, setCategorizationInfo] =
    useState<CategorizationInfo | null>(null);
  const [groupedPapers, setGroupedPapers] = useState<Record<
    string,
    Paper[]
  > | null>(null);

  // Search state
  const [selectedConferences, setSelectedConferences] = useState<string[]>([]);
  const [keyword, setKeyword] = useState<string>("");
  const [threshold, setThreshold] = useState<number[]>([0.65]);

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
      setDirection(1);
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCategorizationComplete = (
    result: Record<string, Paper[]>,
    info: CategorizationInfo
  ) => {
    setGroupedPapers(result);
    setCategorizationInfo(info);
    setDirection(1);
    setCurrentStep(3);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
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
                  戻る
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

        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 && (
            <motion.main
              key="step1"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center gap-8 w-full max-w-7xl px-4"
            >
              <h2 className="text-2xl font-bold mt-3">
                興味のある論文を検索しましょう
              </h2>
              <InputInline
                result={searchResult}
                onResultChange={setSearchResult}
                selectedConferences={selectedConferences}
                onConferencesChange={setSelectedConferences}
                keyword={keyword}
                onKeywordChange={setKeyword}
                threshold={threshold}
                onThresholdChange={setThreshold}
              />
            </motion.main>
          )}

          {currentStep === 2 && (
            <motion.main
              key="step2"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full flex justify-center"
            >
              <CategorizationStep
                papers={searchResult?.papers || []}
                onCategorizationComplete={handleCategorizationComplete}
                inputValue={categorizationInput}
                onInputChange={setCategorizationInput}
                categorizationInfo={categorizationInfo}
                onCategorizationInfoChange={setCategorizationInfo}
              />
            </motion.main>
          )}

          {currentStep === 3 && groupedPapers && categorizationInfo && (
            <motion.main
              key="step3"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full flex justify-center"
            >
              <CategorizationResults
                groupedPapers={groupedPapers}
                categories={categorizationInfo.categories}
              />
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </SidebarInset>
  );
}
