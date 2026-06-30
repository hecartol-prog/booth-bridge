import React, { useState, useRef, useEffect } from "react";
import { invokeLLM } from "@/api/aiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";

const QUICK_QUESTIONS = [
  "What is your MOQ?",
  "What are your lead times?",
  "Which certifications do you have?",
  "Do you export internationally?",
  "What products do you offer?",
];

export default function AiBoothAssistant({ profile, products, catalogs }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi! I'm the AI assistant for **${profile?.company_name}**. Ask me anything about their products, certifications, MOQ, or capabilities.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    const parts = [];
    if (profile?.company_name) parts.push(`Company: ${profile.company_name}`);
    if (profile?.description) parts.push(`Description: ${profile.description}`);
    if (profile?.country) parts.push(`Country: ${profile.country}`);
    if (profile?.factory_type) parts.push(`Factory Type: ${profile.factory_type}`);
    if (profile?.product_categories?.length) parts.push(`Product Categories: ${profile.product_categories.join(", ")}`);
    if (profile?.certifications?.length) parts.push(`Certifications: ${profile.certifications.join(", ")}`);
    if (profile?.website) parts.push(`Website: ${profile.website}`);
    if (products?.length) parts.push(`Products: ${products.map(p => p.title + (p.description ? ` (${p.description})` : "")).join("; ")}`);
    if (catalogs?.length) parts.push(`Catalogs available: ${catalogs.map(c => c.title).join(", ")}`);
    return parts.join("\n");
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    const context = buildContext();
    const history = messages.slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const result = await invokeLLM({
      prompt: `You are the AI assistant for ${profile?.company_name}, an exhibitor at a trade show. 
Answer questions based ONLY on the following company information. Be concise and helpful.
If you don't know the answer from the context, say "I don't have that information — please contact us directly."

COMPANY INFORMATION:
${context}

CONVERSATION HISTORY:
${history}

User question: ${userMsg}

Provide a short, helpful answer.`,
    });
    setMessages(prev => [...prev, { role: "assistant", content: result.result || result }]);
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Ask This Supplier</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border flex flex-col" style={{ maxHeight: "480px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">{profile?.company_name}</p>
            <p className="text-[10px] text-white/70">AI Assistant</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-white/80 hover:text-white" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-[11px] px-2.5 py-1 rounded-full border bg-muted hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && sendMessage()}
          placeholder="Ask anything..."
          className="text-sm"
          disabled={loading}
        />
        <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}