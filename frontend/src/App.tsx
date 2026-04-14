import './App.css';
import React, { useState, useEffect, useRef } from 'react';

interface Message {
  message: string;
  isUser: boolean;
  sources?: string[];
}

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

  // ✅ Typing animation (word-by-word)
  const typeMessage = (fullText: string, sources: string[]) => {
    const words = fullText.split(" ");
    let index = 0;

    // Add empty AI message
    setMessages(prev => [
      ...prev,
      { message: "", isUser: false, sources }
    ]);

    const interval = setInterval(() => {
      index++;

      setMessages(prev => {
        const updated = [...prev];

        const lastMsg = {
          ...updated[updated.length - 1],
          message: words.slice(0, index).join(" ")
        };

        updated[updated.length - 1] = lastMsg;

        return updated;
      });

      if (index >= words.length) {
        clearInterval(interval);
        setLoading(false); // ✅ stop loader after typing finishes
      }
    }, 30); // adjust speed here
  };

  const handleSendMessage = async (message: string) => {
    if (!message) return;

    setInputValue("");
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { message, isUser: true }]);

    try {
      const res = await fetch("http://localhost:8000/rag/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { question: message },
        }),
      });

      const data = await res.json();

      const answer = data.output.answer;
      const docs = data.output.docs;

      const sources = Array.from(
        new Set(docs?.map((doc: any) => doc.metadata.source))
      ).slice(0, 3) as string[];

      // ✅ typing animation
      typeMessage(answer, sources);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSendMessage(inputValue.trim());
    }
  };

  // ✅ Clean source names
  function formatSource(source: string) {
    const file = source.split(/[/\\]/).pop() || "";

    return file
      .replace(".pdf", "")
      .replace(/[-_]/g, " ")
      .replace(/\b\d+\b/g, "")
      .slice(0, 50);
  }

  return (
  <div className="h-screen flex flex-col bg-[#343541] text-white">

    {/* Header */}
    <div className="p-4 text-center border-b border-gray-700 font-semibold">
      Epic v. Apple Legal Assistant ⚖️
    </div>

    {/* Chat Area */}
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

      <div className="flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap
              ${msg.isUser
                ? "bg-green-600 text-white rounded-br-none"
                : "bg-gray-800 text-gray-100 rounded-bl-none"
              }`}
            >
              {msg.message}

              {/* Sources */}
              {!msg.isUser && msg.sources && (
                <div className="mt-3 text-xs text-gray-400">
                  <hr className="mb-2 border-gray-600" />
                  {msg.sources.map((source, idx) => (
                    <div key={idx}>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`http://localhost:8000/pdfs/${encodeURIComponent(
                          source.split(/[/\\]/).pop() || ""
                        )}`}
                        className="text-blue-400 hover:underline"
                      >
                        {formatSource(source)}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Auto scroll */}
        <div ref={chatEndRef} />
      </div>

      {/* Loader */}
      {loading && (
        <div className="text-center text-gray-400 text-sm mt-2">
          AI is typing...
        </div>
      )}
    </div>

    {/* Input (Sticky Bottom like ChatGPT) */}
    <div className="p-4 border-t border-gray-700 bg-[#40414f]">
      <div className="flex gap-2">
        <textarea
          className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-600 text-white resize-none"
          placeholder="Send a message..."
          onKeyDown={handleKeyPress}
          onChange={(e) => setInputValue(e.target.value)}
          value={inputValue}
        />

        <button
          className="bg-green-600 px-5 rounded-lg hover:bg-green-700 disabled:opacity-50"
          onClick={() => handleSendMessage(inputValue.trim())}
          disabled={!inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>

  </div>
);
}

export default App;