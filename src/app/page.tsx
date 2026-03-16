"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Scroll, Flame, Loader2 } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  role: "user" | "model";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "어둠이 짙게 깔린 주점의 한구석, 후드를 깊게 눌러쓴 마스터가 당신을 바라봅니다. \n\n**\"보아하니, 새로운 이야기를 찾는 자로군. 어서 자리에 앉게. 자네가 뛰어들고 싶은 모험은 어떤 것인가?\"**"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Add User message
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "알 수 없는 에러가 발생했습니다.");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

      let accumulatedResponse = "";
      const textDecoder = new TextDecoder();
      
      // Add an initial empty message for the model
      setMessages([...newMessages, { role: "model", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = textDecoder.decode(value, { stream: true });
        accumulatedResponse += chunk;

        // Update the last message (the model's response) with the accumulated text
        setMessages([...newMessages, { role: "model", content: accumulatedResponse }]);
      }
    } catch (error: any) {
      setMessages([
        ...newMessages,
        { role: "model", content: `(GM 시스템 오류: \n ${error.message})` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 font-sans text-slate-100">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-red-900/50 bg-slate-900/80 backdrop-blur-sm z-10 shadow-[0_4px_30px_rgba(153,27,27,0.1)]">
        <div className="p-2 border border-red-800 rounded-lg bg-red-950/30">
          <Flame className="w-6 h-6 text-red-600 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-amber-100 tracking-wider">TRPG Master AI</h1>
          <p className="text-xs text-red-500/80">어둠의 틈새에서 엮어내는 끝없는 서사</p>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-parchment-pattern">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col max-w-4xl mx-auto",
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            {/* avatar/name label */}
            <div className="flex items-center gap-2 mb-1 px-1">
              {msg.role === "model" ? (
                <>
                  <Scroll size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-500/80 uppercase tracking-widest">Game Master</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Player</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                "relative group px-6 py-4 rounded-2xl shadow-xl border text-sm md:text-base transition-all duration-300",
                msg.role === "user"
                  ? "bg-slate-800 border-slate-700 text-slate-200 rounded-tr-sm"
                  : "bg-black/60 backdrop-blur-md border border-red-900/50 text-slate-300 rounded-tl-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] w-full"
              )}
            >
              <div className="markdown-body">
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col max-w-4xl mx-auto items-start">
             <div className="flex items-center gap-2 mb-1 px-1">
                <Scroll size={14} className="text-amber-500" />
                <span className="text-xs font-bold text-amber-500/80 uppercase tracking-widest">Game Master</span>
            </div>
            <div className="px-6 py-4 rounded-2xl rounded-tl-none bg-black/60 backdrop-blur-md border border-red-900/50 shadow-xl flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
              <span className="text-slate-400 text-sm animate-pulse">운명의 주사위를 굴리고 있습니다...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 p-4 border-t border-red-900/30 bg-slate-900/90 backdrop-blur-md">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="마스터에게 묻거나 행동을 선언하세요... (예: 1d20 힘 판정 굴릴게)"
            className="flex-1 bg-slate-800/80 border border-slate-700 focus:border-red-800 focus:ring-1 focus:ring-red-800 rounded-xl px-5 py-3.5 text-slate-200 placeholder-slate-500 outline-none transition-all disabled:opacity-50 text-sm md:text-base"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-br from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-amber-100 px-6 py-3 rounded-xl shadow-lg border border-red-900/50 flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(153,27,27,0.5)] active:scale-95"
          >
            <span className="hidden sm:inline">행동 선언</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
