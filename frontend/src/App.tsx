import React, { useState } from 'react';
import './App.css';

interface Message {
  message: string;
  isUser: boolean;
  sources?: string[];
}

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 text-white text-center p-4">
        Epic v. Apple Legal Assistant
      </header>

      <main className="flex-grow container mx-auto p-4 flex-col">
        <div className="flex-grow bg-gray-700 shadow overflow-hidden sm:rounded-lg">
          
          {/* Messages */}
          <div className="border-b border-gray-600 p-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 my-3 rounded-lg text-white ${
                  msg.isUser ? "bg-gray-800 ml-auto" : "bg-gray-900 mr-auto"
                }`}
              >
                {msg.message}

                {/* Sources */}
                {!msg.isUser && msg.sources && (
                  <div className="text-xs mt-3">
                    <hr className="border-b mb-2" />
                    {msg.sources.map((source, idx) => (
                      <div key={idx}>
                        <a
                          target="_blank"
                          download
                          href={`http://localhost:8000/pdfs/${encodeURIComponent(
                            source.split(/[/\\]/).pop() || ""
                          )}`}
                          rel="noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {formatSource(source)}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loader */}
            {loading && (
              <div className="text-gray-400 italic">AI is typing...</div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-gray-800">
            <textarea
              className="w-full p-2 border rounded text-white bg-gray-900 border-gray-600 resize-none"
              placeholder="Enter your message here..."
              onKeyDown={handleKeyPress}
              onChange={(e) => setInputValue(e.target.value)}
              value={inputValue}
            />

            <button
              className="mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleSendMessage(inputValue.trim())}
            >
              Send
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white text-center p-4 text-xs">
        *AI Agents can make mistakes. Consider checking important information.
        <br />
        All training data derived from public records
        <br /><br />
        © 2024 Focused Labs
      </footer>
    </div>
  );
}

export default App;