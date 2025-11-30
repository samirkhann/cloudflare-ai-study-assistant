'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCcw, Zap, Code, Brain, Flame, ChevronRight, Github } from 'lucide-react';

/**
 * Message Interface
 * I defined a simple interface to type-check the conversation messages.
 * Each message tracks whether it came from the user or the AI assistant.
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Markdown Renderer Component
 * 
 * I built this custom markdown parser to handle the AI's formatted responses.
 * Rather than pulling in a heavy library like react-markdown, I opted for a
 * lightweight solution that covers the essential formatting patterns:
 * headers, bold/italic text, code snippets, and lists.
 * 
 * This keeps the bundle size small while still providing a polished reading experience.
 */
function MarkdownRenderer({ content }: { content: string }) {
  // I process each line individually to handle block-level elements like headers and lists
  const renderLine = (line: string, index: number) => {
    // Header detection - I check for markdown header syntax (# ## ###)
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-lg font-semibold text-white mt-4 mb-2">{parseInlineMarkdown(line.slice(4))}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-xl font-semibold text-white mt-4 mb-2">{parseInlineMarkdown(line.slice(3))}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-2xl font-bold text-white mt-4 mb-2">{parseInlineMarkdown(line.slice(2))}</h1>;
    }

    // Bullet point detection - supporting both * and - syntax for flexibility
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return (
        <div key={index} className="flex gap-2 ml-4 mb-1">
          <span className="text-indigo-400 mt-1">•</span>
          <span>{parseInlineMarkdown(line.slice(2))}</span>
        </div>
      );
    }

    // Numbered list detection using regex to capture the number and content
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex gap-3 ml-4 mb-2">
          <span className="text-indigo-400 font-semibold min-w-[1.5rem]">{numberedMatch[1]}.</span>
          <span className="flex-1">{parseInlineMarkdown(numberedMatch[2])}</span>
        </div>
      );
    }

    // Empty lines create visual spacing between paragraphs
    if (line.trim() === '') {
      return <div key={index} className="h-3" />;
    }

    // Default: render as a paragraph with inline markdown parsing
    return <p key={index} className="mb-2 leading-relaxed">{parseInlineMarkdown(line)}</p>;
  };

  /**
   * Inline Markdown Parser
   * 
   * I implemented this recursive parser to handle inline formatting like bold,
   * italic, and code. It scans through the text, finds markdown patterns,
   * and wraps them in the appropriate styled components.
   */
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold text detection (**text**)
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
        }
        parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Italic text detection (*text*)
      const italicMatch = remaining.match(/\*(.+?)\*/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, italicMatch.index)}</span>);
        }
        parts.push(<em key={key++} className="italic text-zinc-300">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // Inline code detection (`code`)
      const codeMatch = remaining.match(/`(.+?)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0) {
          parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
        }
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-zinc-800 rounded text-indigo-300 text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
        continue;
      }

      // No more patterns found - add remaining text and exit
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    return parts.length > 0 ? parts : text;
  };

  const lines = content.split('\n');

  return <div className="space-y-1">{lines.map((line, index) => renderLine(line, index))}</div>;
}

/**
 * Main Application Component
 * 
 * This is the core of my AI Study Assistant application. I designed it as a
 * single-page chat interface that communicates with a Cloudflare Workers backend.
 * 
 * Key architectural decisions:
 * - Used React hooks for state management to keep the component self-contained
 * - Implemented auto-scroll to ensure users always see the latest messages
 * - Added keyboard-first UX with auto-focus on the input field
 * - Included quick-start prompts to help users discover the AI's capabilities
 */
export default function Page() {
  // Core state management for the chat functionality
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Refs for DOM manipulation - used for scrolling and focus management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll effect: ensures the chat view follows new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus management: positions cursor in input on initial load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Message Handler
   * 
   * I structured this as an async function to handle the API communication
   * with my Cloudflare Workers backend. The try-catch ensures graceful
   * error handling if the edge network is unreachable.
   */
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(
        'https://ai-study-assistant.samirkhan.workers.dev/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, conversationId: 'default' }),
        }
      );
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      // Graceful degradation with user-friendly error message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I encountered a connection error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      // Restore focus for seamless continued typing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /**
   * Conversation Reset Handler
   * 
   * This clears both the frontend state and the backend conversation history
   * stored in Durable Objects. Important for starting fresh sessions.
   */
  const clearChat = async () => {
    try {
      await fetch('https://ai-study-assistant.samirkhan.workers.dev/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'default' }),
      });
    } catch (e) {
      console.error('Failed to clear backend history', e);
    }
    setMessages([]);
  };

  /**
   * Quick Start Prompts
   * 
   * I curated these examples to showcase the AI's versatility across different
   * academic subjects. The gradient colors provide visual distinction and
   * make the interface more engaging.
   */
  const examples = [
    { icon: Brain, label: 'Explain neural networks', desc: 'Deep learning basics', gradient: 'from-violet-500 to-fuchsia-500' },
    { icon: Code, label: 'QuickSort Algorithm', desc: 'Time complexity analysis', gradient: 'from-blue-500 to-cyan-500' },
    { icon: Flame, label: 'Thermodynamics', desc: 'Laws of heat & energy', gradient: 'from-orange-500 to-red-500' },
    { icon: Zap, label: 'Quadratic Equations', desc: 'Step-by-step solutions', gradient: 'from-yellow-400 to-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-indigo-500/30">
      {/* 
        Background Ambient Glow
        I added these subtle gradient orbs to create depth and visual interest
        without distracting from the content. The blur effect softens them nicely.
      */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-900/10 rounded-full blur-[128px]" />
      </div>

      {/* 
        Navigation Bar
        I implemented a sticky header with backdrop blur for a modern glass effect.
        The branding uses an accent color to establish visual identity.
      */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#050505]/80 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200" />
              <div className="relative w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center border border-white/10">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide text-zinc-100">
                Study<span className="text-indigo-400">Assistant</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                Cloudflare Edge AI
              </span>
            </div>
          </div>

          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-0 disabled:pointer-events-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Context
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* 
            Welcome Screen / Empty State
            I designed this to guide new users and provide immediate value
            through the quick-start prompts. The large typography creates impact.
          */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-rose-500/20 blur-[64px] rounded-full" />
                <h1 className="relative text-5xl md:text-7xl font-bold text-center tracking-tighter bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent">
                  Research.
                  <br />
                  Refined.
                </h1>
              </div>

              <p className="text-zinc-400 text-center max-w-md mb-12 text-lg font-light leading-relaxed">
                Your advanced study companion. Powered by Llama 3.3 for reasoning, running on durable edge infrastructure.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(example.label)}
                    className="group relative flex items-center gap-4 p-4 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-white/5 hover:border-white/10 transition-all duration-300 text-left"
                  >
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${example.gradient} opacity-80 group-hover:opacity-100 shadow-lg`}>
                      <example.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {example.label}
                      </div>
                      <div className="text-xs text-zinc-500 group-hover:text-zinc-400">{example.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 
            Chat Messages Container
            I structured messages with distinct styling for user vs AI responses.
            The avatar system provides clear visual attribution.
          */}
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`group flex gap-4 md:gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}
              >
                {/* Message Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${
                    msg.role === 'user' ? 'bg-zinc-800 border-zinc-700' : 'bg-indigo-600/20 border-indigo-500/30'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="text-xs font-bold text-zinc-300">YOU</span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  )}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`relative max-w-[85%] lg:max-w-[80%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100'
                      : 'bg-zinc-900/60 border border-zinc-800/50 text-zinc-200'
                  }`}
                >
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))}

            {/* Loading State with Animated Dots */}
            {loading && (
              <div className="flex gap-5 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600/20 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 h-8 px-5 py-4 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </main>

      {/* 
        Input Area
        I positioned this as a sticky footer with a gradient fade above it
        to create a seamless transition as content scrolls behind.
      */}
      <div className="sticky bottom-0 z-20">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 pb-4">
          <form onSubmit={sendMessage} className="relative group">
            {/* Gradient glow effect on focus */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-2xl opacity-0 group-focus-within:opacity-20 blur-md transition duration-500"></div>

            <div className="relative flex items-center bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5 group-focus-within:ring-white/10 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-zinc-100 placeholder-zinc-500 text-[15px] leading-relaxed"
                disabled={loading}
              />

              <div className="pr-2 flex items-center gap-1">
                {input.length > 0 && !loading && (
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                  >
                    <Send className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
                {loading && (
                  <div className="p-2">
                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Status Indicator and Footer Attribution */}
          <div className="flex flex-col items-center gap-2 mt-3 pb-2">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              Systems Operational
            </div>
            
            {/* Developer Attribution */}
            <a
              href="https://github.com/samirkhann"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-medium"
            >
              <span>Built by</span>
              <span className="text-zinc-400 hover:text-white transition-colors">Samir Khan</span>
              <Github className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}