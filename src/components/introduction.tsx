"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";
import FloatingLines from "./FloatingLines";
import { AnimatedGradientText } from "./ui/animated-gradient-text";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { MagicCard } from "./ui/magic-card";

export function Introduction() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full px-4 text-center space-y-8 animate-in fade-in duration-700 overflow-hidden">
      <AnimatedThemeToggler className="fixed top-4 right-4 z-50" />
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-background">
        <FloatingLines
          enabledWaves={["top", "bottom", "middle"]}
          lineDistance={10}
          lineCount={10}
          interactive={false}
        />
      </div>

      <div className="space-y-4 max-w-2xl z-10 glass-panel p-8 rounded-2xl">
        <div className="group relative mx-auto flex w-fit items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]">
          <span
            className={cn(
              "animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]"
            )}
            style={{
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "destination-out",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "subtract",
              WebkitClipPath: "padding-box",
            }}
          />
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
          <AnimatedGradientText className="text-sm font-medium">
            AI-Powered Research Assistant
          </AnimatedGradientText>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Paper Agent
        </h1>
        <p className="text-xl text-muted-foreground">
          Discover, analyze, and manage academic papers with the power of AI.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 z-10">
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="group relative h-12 px-8 rounded-lg font-semibold text-lg text-white overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
          <span className="relative flex items-center justify-center gap-2">
            {loading ? "Loading..." : "Get Started"}
            {!loading && (
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            )}
          </span>
        </button>
        <p className="text-sm text-muted-foreground">
          Google Account login required
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl text-left z-10">
        <MagicCard className="rounded-xl">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2">Smart Search</h3>
            <p className="text-muted-foreground">
              Find relevant papers using natural language queries powered by
              advanced embeddings.
            </p>
          </div>
        </MagicCard>
        <MagicCard className="rounded-xl">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2">AI Analysis</h3>
            <p className="text-muted-foreground">
              Get instant summaries and insights from papers without reading the
              entire document.
            </p>
          </div>
        </MagicCard>
        <MagicCard className="rounded-xl">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-2">Organized Library</h3>
            <p className="text-muted-foreground">
              Save interesting papers to your personal library and manage them
              with ease.
            </p>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}
