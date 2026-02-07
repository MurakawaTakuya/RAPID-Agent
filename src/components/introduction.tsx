"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Sparkles } from "lucide-react";
import FloatingLines from "./FloatingLines";

export function Introduction() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full px-4 text-center space-y-8 animate-in fade-in duration-700 overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-background">
        <FloatingLines
          enabledWaves={["top", "bottom", "middle"]}
          lineDistance={15}
          lineCount={13}
          interactive={false}
        />
      </div>

      <div className="space-y-4 max-w-2xl z-10 glass-panel p-8 rounded-2xl">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
          <Sparkles className="mr-2 h-4 w-4" />
          <span>AI-Powered Research Assistant</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Paper Agent
        </h1>
        <p className="text-xl text-muted-foreground">
          Discover, analyze, and manage academic papers with the power of AI.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 z-10">
        <Button
          size="lg"
          onClick={signInWithGoogle}
          disabled={loading}
          className="font-semibold text-lg h-12 px-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          {loading ? "Loading..." : "Get Started"}
          {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
        <p className="text-sm text-muted-foreground">
          Google Account login required
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl text-left z-10">
        <div className="p-6 rounded-xl border bg-card/80 backdrop-blur-sm text-card-foreground shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="font-semibold text-lg mb-2">Smart Search</h3>
          <p className="text-muted-foreground">
            Find relevant papers using natural language queries powered by
            advanced embeddings.
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card/80 backdrop-blur-sm text-card-foreground shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="font-semibold text-lg mb-2">AI Analysis</h3>
          <p className="text-muted-foreground">
            Get instant summaries and insights from papers without reading the
            entire document.
          </p>
        </div>
        <div className="p-6 rounded-xl border bg-card/80 backdrop-blur-sm text-card-foreground shadow-sm hover:shadow-md transition-all duration-300">
          <h3 className="font-semibold text-lg mb-2">Organized Library</h3>
          <p className="text-muted-foreground">
            Save interesting papers to your personal library and manage them
            with ease.
          </p>
        </div>
      </div>
    </div>
  );
}
