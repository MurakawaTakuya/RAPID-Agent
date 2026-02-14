"use client";

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
  FileTextIcon,
  LoaderCircleIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";

interface SearchStepperProps {
  currentStep: number;
}

const steps = [
  {
    title: "検索",
    icon: <SearchIcon className="size-4" />,
  },
  {
    title: "グループ化",
    icon: <FileTextIcon className="size-4" />,
  },
  {
    title: "Hoge",
    icon: <SendIcon className="size-4" />,
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
      <StepperNav className="gap-0">
        {steps.map((step, index) => (
          <StepperItem
            key={index}
            step={index + 1}
            className="relative flex items-center"
          >
            <StepperTrigger className="flex items-center gap-3" asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                <StepperIndicator className="data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground data-[state=completed]:bg-primary size-8 border-2 data-[state=completed]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary">
                  {step.icon}
                </StepperIndicator>
                <div className="flex flex-col items-start">
                  <StepperTitle className="text-sm font-semibold">
                    {step.title}
                  </StepperTitle>
                </div>
              </div>
            </StepperTrigger>

            {steps.length > index + 1 && (
              <StepperSeparator className="bg-muted h-0.5 w-12 mx-4" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
