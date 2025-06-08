"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/messages?sessionId=${sessionId}`);
        if (response.ok) {
          const data: { messages: Message[] } = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => [...prev, ...data.messages]);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = { id: uuidv4(), role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input, sessionId }),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Symptalk AI Chat
        </h1>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex mb-4 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <footer className="bg-white dark:bg-gray-800 shadow-md p-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </main>
  );
}
