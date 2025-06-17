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
  <main className="flex flex-col items-center justify-center h-screen bg-white">
    
    {/* headline */}
    <h1 className="text-4xl font-semibold text-blue-700 mb-40">
      Symptalk
    </h1>

    {/* decline button */}
    <div className="flex flex-col items-center">
      {/* button */}
      <button className="bg-gray-300 border-4 border-red-500 rounded-full p-8 mb-2 shadow-md hover:scale-105 transition-transform">
        <img src="/phone-off.png" alt="Decline" className="w-16 h-16" />
      </button>

    </div>

  </main>
);
}
  );
}
