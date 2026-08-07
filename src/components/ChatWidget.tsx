"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, X, PaperPlaneTilt } from "@phosphor-icons/react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "What's the analyst consensus on NVDA?",
  "Any recent insider trades I should know about?",
  "What's on the economic calendar this week?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the assistant — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] flex-col rounded-lg border border-panel-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--panel)_100%,white_5%)_0%,var(--panel)_100%)] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">DollarWatch Assistant</p>
              <p className="text-xs text-muted">Answers from data shown on this site</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-muted transition-colors hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted">Try asking:</p>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="block w-full rounded-md border border-panel-border px-3 py-2 text-left text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-accent text-background"
                    : "border border-panel-border bg-background/40 text-foreground"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-md border border-panel-border bg-background/40 px-3 py-2 text-sm text-muted">
                Thinking…
              </div>
            )}
            {error && <p className="text-xs text-negative">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-panel-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a stock, trade, or event…"
              maxLength={2000}
              className="flex-1 rounded-md border border-panel-border bg-background/60 px-3 py-2 text-sm outline-none focus-visible:border-accent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-opacity disabled:opacity-40"
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </button>
          </form>
          <p className="border-t border-panel-border px-4 py-2 text-[11px] text-muted">
            Not financial advice — informational only.
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-background shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
      >
        {open ? <X size={20} weight="bold" /> : <ChatCircleDots size={22} weight="fill" />}
      </button>
    </div>
  );
}
