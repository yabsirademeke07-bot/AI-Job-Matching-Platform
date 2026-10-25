import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquareText, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getSeekerConversation,
  getSeekerConversations,
  sendSeekerMessage,
} from "../services/messageService";

const formatTime = (value) => {
  if (!value) return "";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? ""
    : timestamp.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

function ConversationThread({ conversationId, userId }) {
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let active = true;
    getSeekerConversation(conversationId)
      .then(({ data }) => {
        if (!active) return;
        setConversation(data?.conversation || null);
        setMessages(data?.messages || []);
        window.dispatchEvent(new Event("seeker-messages:updated"));
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Unable to open conversation:", requestError);
        setError(requestError.response?.data?.message || "Unable to open conversation.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [conversationId]);

  const handleSend = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) {
      setSendError("Please enter a message.");
      return;
    }
    if (message.length > 5000) {
      setSendError("Message is too large.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const { data } = await sendSeekerMessage(conversationId, message);
      const savedMessage = data?.message;
      if (!savedMessage) throw new Error("The server did not return the saved message.");
      setMessages((current) => [...current, savedMessage]);
      setInput("");
      window.dispatchEvent(new Event("seeker-messages:updated"));
    } catch (requestError) {
      console.error("Unable to send message:", requestError);
      setSendError(requestError.response?.data?.message || requestError.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex min-h-[580px] min-w-0 flex-1 flex-col bg-white">
      {loading ? (
        <p className="m-auto p-10 text-center text-sm text-slate-500">Loading conversation...</p>
      ) : error ? (
        <p role="alert" className="m-auto p-10 text-center text-sm text-rose-700">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3.5">
            <button type="button" onClick={() => navigate("/chat")} className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-sky-600 md:hidden">
              <ArrowLeft className="h-4 w-4" /> Back to Messages
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                {(conversation?.companyName || conversation?.employerName || "E").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-bold text-slate-900">{conversation?.companyName || conversation?.employerName || "Employer"}</h2>
                <p className="truncate text-xs text-slate-500">{conversation?.jobTitle || "Application"} · active</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length ? messages.map((message) => {
              const isSeekerMessage = String(message.senderId) === String(userId);
              return (
                <div key={message.id} className={`flex ${isSeekerMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md rounded-2xl border px-4 py-2.5 text-sm shadow-xs ${isSeekerMessage ? "rounded-tr-sm border-sky-200 bg-sky-100 text-slate-900" : "rounded-tl-sm border-slate-200 bg-white text-slate-900"}`}>
                    <p className="whitespace-pre-wrap break-words font-normal leading-relaxed">{message.text}</p>
                    <span className={`mt-1 block text-right font-mono text-[10px] ${isSeekerMessage ? "text-sky-700/75" : "text-slate-400"}`}>{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              );
            }) : (
              <p className="flex h-full min-h-64 items-center justify-center text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-slate-200 bg-white p-4">
            <input
              value={input}
              onChange={(event) => { setInput(event.target.value); setSendError(""); }}
              placeholder="Write a message..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500"
            />
            <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50">
              <Send className="h-4 w-4" />{sending ? "Sending..." : "Send"}
            </button>
            {sendError && <p role="alert" className="text-xs font-semibold text-rose-600">{sendError}</p>}
          </form>
        </>
      )}
    </section>
  );
}

export default function Communication() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = String(user?.role || "").toLowerCase();

  useEffect(() => {
    let active = true;
    getSeekerConversations()
      .then(({ data }) => {
        if (active) setConversations(data?.conversations || []);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Unable to load conversations:", requestError);
          setError(requestError.response?.data?.message || "Unable to load conversations.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [conversationId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      [item.companyName, item.employerName, item.jobTitle, item.lastMessage]
        .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [conversations, search]);

  if (role === "employer") {
    return <Navigate to="/employer/messages" replace />;
  }

  return (
    <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5">
          <div className="flex items-center gap-2.5">
            <MessageSquareText className="w-7 h-7 text-sky-600 stroke-[2.2]" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Messages
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Communicate with employers reviewing your applications.</p>
        </header>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        <section className="flex min-h-[580px] flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Messages">
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <label><span className="sr-only">Search conversations</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employers..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-sky-500"
                />
              </label>
            </div>
            <div className="max-h-[560px] overflow-y-auto" aria-label="Conversation list">
              {loading ? (
                <p className="p-8 text-center text-sm text-slate-500">Loading conversations...</p>
              ) : filteredConversations.length ? filteredConversations.map((item) => (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => navigate(`/chat/${item.conversationId}`)}
                  aria-current={String(conversationId) === String(item.conversationId) ? "page" : undefined}
                  className={`w-full border-b border-slate-100 border-l-4 p-4 text-left transition ${String(conversationId) === String(item.conversationId) ? "border-l-sky-500 bg-sky-50/50" : "border-l-transparent hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                      {(item.companyName || item.employerName || "E").charAt(0).toUpperCase()}
                    </span>
                    <h2 className={`min-w-0 flex-1 truncate text-sm text-slate-900 ${item.unreadCount ? "font-black" : "font-bold"}`}>{item.companyName || item.employerName}</h2>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">{formatTime(item.lastMessageTime)}</span>
                      {Number(item.unreadCount) > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{item.unreadCount}</span>}
                    </div>
                  </div>
                </button>
              )) : (
                !error && <div className="p-8 text-center">
                  <h2 className="text-sm font-bold text-slate-800">{search ? "No conversations found." : "No conversations yet."}</h2>
                  {search && <p className="mt-2 text-xs text-slate-500">Try searching with a different term.</p>}
                </div>
              )}
            </div>
          </aside>
          {conversationId ? (
            <ConversationThread key={conversationId} conversationId={conversationId} userId={user?.id} />
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
              Select an employer to view messages.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
