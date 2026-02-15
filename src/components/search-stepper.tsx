"use client";

import { cn } from "@/lib/utils";

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import {
  CheckIcon,
  CircleDot,
  FileTextIcon,
  LoaderCircleIcon,
  SearchIcon,
  Sparkles,
} from "lucide-react";

interface SearchStepperProps {
  currentStep: number;
}

const steps = [
  {
    title: "論文検索",
    icon: <SearchIcon className="size-4" />,
  },
  {
    title: "分類方法の決定",
    icon: <Sparkles className="size-4" />,
  },
  {
    title: "分類結果",
    icon: <FileTextIcon className="size-4" />,
  },
];

export function SearchStepper({ currentStep }: SearchStepperProps) {
  return (
    <Stepper
      value={currentStep}
      indicators={{
        completed: <CheckIcon className="size-3.5" />,
        loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
      }}
      className="w-full max-w-xl space-y-0 flex items-center justify-center h-full" // Removed space-y-8 to fit in header better
    >
      <StepperNav className="gap-0 justify-center">
        {steps.map((step, index) => (
          <StepperItem
            key={index}
            step={index + 1}
            className={cn(
              "relative flex items-center",
              index + 1 !== currentStep && "hidden md:flex"
            )}
          >
            <StepperTrigger className="flex items-center gap-3" asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                <StepperIndicator className="data-[state=active]:bg-background data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground data-[state=completed]:bg-primary size-8 border-2 data-[state=completed]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
                  {currentStep === index + 1 ? (
                    <CircleDot className="size-4 animate-pulse" />
                  ) : (
                    step.icon
                  )}
                </StepperIndicator>
                <div className="flex flex-col items-start">
                  <StepperTitle className="text-sm font-semibold whitespace-nowrap">
                    {step.title}
                  </StepperTitle>
                </div>
              </div>
            </StepperTrigger>

            {steps.length > index + 1 && (
              <StepperSeparator className="bg-muted h-0.5 w-12 mx-4 hidden md:block" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
