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
    <main className="flex flex-col h-screen bg-white">
      {/* haedline */}
      <div className="bg-blue-500 py-6 text-center">
        <h1 className="text-white text-xl font-semibold">Please Select A Service</h1>
      </div>

      {/* middle */}
      <div
        className="flex-1 flex flex-col items-center justify-center bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/doctor_illustration.png')", // replace with image path
        }}
      >
        <div className="flex gap-6 mt-10">
          {/* Call button */}
          <button
            onClick={() => alert("Call clicked")} // or router.push('/call')
            className="flex flex-col items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-full shadow-md hover:bg-blue-600"
          >
            📞
            <span className="mt-1 font-medium">Call</span>
          </button>

          {/* Chat button */}
          <button
            onClick={() => router.push("/chat")} // replace Chat routine
            className="flex flex-col items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-full shadow-md hover:bg-blue-600"
          >
            💬
            <span className="mt-1 font-medium">Chat</span>
          </button>
        </div>
      </div>
    </main>
  );
}
  );
}
