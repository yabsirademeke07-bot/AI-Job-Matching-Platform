import { useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';

const suggestions = [
  'Find high-match React jobs',
  'How can I improve my CV?',
  'Show remote opportunities',
];

export default function GoogleAiAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your AI career assistant. Ask me about jobs, CV improvements, salaries, or applications.',
    },
  ]);

  const sendMessage = (message = input) => {
    const text = message.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text },
      {
        id: `assistant-${Date.now() + 1}`,
        role: 'assistant',
        text: `I can help you with "${text}". Start by uploading your CV or exploring jobs to get a personalized match.`,
      },
    ]);
    setInput('');
  };

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-[#f5f9ff] px-6 py-16 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(86,162,216,0.2),transparent_52%)]" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-[#2b73a4] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#56a2d8]" />
            Google AI Assistant
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Your personal AI career assistant
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
            Get practical guidance for finding the right tech opportunity faster.
          </p>
        </div>

        <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-blue-100/60">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#56a2d8] to-[#2b73a4] text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">AI career guide</h3>
              <p className="text-sm text-emerald-600">Online and ready to help</p>
            </div>
          </div>

          <div className="max-h-80 space-y-4 overflow-y-auto bg-slate-50/80 p-5 sm:p-7">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-[#2b73a4]'}`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 sm:text-base ${message.role === 'user' ? 'bg-[#2b73a4] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#2b73a4] transition hover:bg-blue-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-2 focus-within:border-[#56a2d8]"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask your AI career assistant..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-slate-900 outline-none placeholder:text-slate-500"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2b73a4] text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
