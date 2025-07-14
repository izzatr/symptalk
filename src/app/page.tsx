"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import { Message } from "@/lib/types";
import { Send, Mic, X, MicOff, Square, HeartPlus } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import Lottie from "lottie-react";
import aiAnimation from "../../public/ai.json";

// Chat UI Component
const ChatUI = ({
  messages,
  messagesEndRef,
  input,
  handleInputChange,
  handleSubmit,
  switchToVoiceMode,
}: {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent) => void;
  switchToVoiceMode: () => void;
}) => (
  <>
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
              className={`px-4 py-2 rounded-2xl ${
                m.role === "user"
                  ? "bg-symp-light-gray text-symp-blue rounded-br-none"
                  : "bg-symp-blue text-white rounded-bl-none"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
    <footer className="bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-symp-blue text-black"
            placeholder="Type your message..."
          />
          <button
            type="submit"
            className="bg-symp-blue text-white p-3 rounded-r-lg hover:bg-blue-600"
          >
            <Send size={20} />
          </button>
          <button
            type="button"
            onClick={switchToVoiceMode}
            className="bg-gray-200 text-gray-600 p-3 rounded-full ml-2 hover:bg-gray-300"
          >
            <Mic size={20} />
          </button>
        </form>
      </div>
    </footer>
  </>
);

// Voice UI Component
const VoiceUI = ({
  isRecording,
  isProcessing,
  isMuted,
  toggleMute,
  toggleRecording,
  switchToChatMode,
  selectedModel,
  onModelChange,
}: {
  isRecording: boolean;
  isProcessing: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  toggleRecording: () => void;
  switchToChatMode: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}) => (
  <div className="flex flex-col items-center justify-center flex-1 p-4">
    <div className="relative w-64 h-64">
      <Lottie animationData={aiAnimation} />
      <div className="absolute inset-5 flex items-center justify-center">
        <HeartPlus size={40} className="text-white" />
      </div>
    </div>

    <div className="mt-4 text-center">
      {isProcessing ? (
        <div className="text-symp-blue font-medium">Processing...</div>
      ) : isRecording ? (
        <div className="text-red-600 font-medium">Tap to stop</div>
      ) : (
        <div className="text-gray-500 font-medium">Tap to talk</div>
      )}
    </div>

    <div className="my-4">
      <label htmlFor="tts-model" className="mr-2 text-gray-600">
        Voice Model:
      </label>
      <select
        id="tts-model"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-symp-blue text-gray-600"
      >
        <option value="A">Model A</option>
        <option value="B">Model B</option>
        <option value="C">Model C</option>
      </select>
    </div>

    <button
      onClick={toggleRecording}
      disabled={isProcessing}
      className={`mt-6 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
        isRecording
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-white hover:bg-gray-100 text-symp-blue"
      } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isRecording ? (
        <Square size={32} className="fill-current" />
      ) : (
        <Mic size={32} />
      )}
    </button>

    <div className="flex mt-10 space-x-4">
      {/* <button
        onClick={toggleMute}
        className="bg-white text-red-500 p-4 rounded-full shadow-lg hover:bg-gray-100"
      >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
      </button> */}
      <button
        onClick={switchToChatMode}
        className="bg-white text-gray-600 p-4 rounded-full shadow-lg hover:bg-gray-100"
      >
        <X size={24} />
      </button>
    </div>
  </div>
);

export default function Home() {
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [ttsModel, setTtsModel] = useState("A");
  const ws = useRef<WebSocket | null>(null);

  const {
    isRecording,
    isProcessing,
    setIsProcessing,
    toggleRecording,
    cleanup,
  } = useVoiceRecording(ws, isMuted, ttsModel);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setMessages([
      {
        id: uuidv4(),
        role: "bot",
        text: "Hello, my name is Symptalk, your doctor appointment assistant. How can I help you today?",
        timestamp: Date.now(),
      },
    ]);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl =
      process.env.NODE_ENV === "production"
        ? `${protocol}//${window.location.host}/ws?sessionId=${newSessionId}`
        : `ws://localhost:3000/ws?sessionId=${newSessionId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => console.log("WebSocket connection established");
    ws.current.onclose = () => console.log("WebSocket connection closed");
    ws.current.onerror = (error) => console.error("WebSocket error:", error);

    ws.current.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      if (eventData.type === "bot_message") {
        setIsProcessing(false);
        const botMessage: Message = {
          id: uuidv4(),
          role: "bot",
          text: eventData.data.text,
          audioUrl: eventData.data.audioUrl,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else if (eventData.type === "transcript") {
        const userMessage: Message = {
          id: uuidv4(),
          role: "user",
          text: eventData.text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage]);
      } else if (eventData.type === "error") {
        console.error("Server error:", eventData.message);
        setIsProcessing(false);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      mode === "voice" &&
      lastMessage?.role === "bot" &&
      lastMessage.audioUrl &&
      lastMessage.audioUrl.startsWith("http")
    ) {
      const audio = new Audio(lastMessage.audioUrl);
      audio.play().catch((e) => console.error("Error playing audio:", e));
    }
  }, [messages, mode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || ws.current?.readyState !== WebSocket.OPEN)
      return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      text: input,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send message via WebSocket instead of HTTP
    ws.current.send(
      JSON.stringify({
        type: "chat_message",
        text: input,
        sessionId,
        mode: "chat",
      })
    );

    setInput("");
  };

  useEffect(() => {
    console.log("mode", mode);
  }, [mode]);

  // Clean up recording when switching modes
  useEffect(() => {
    if (mode === "chat") {
      cleanup();
    }
  }, [mode, cleanup]);

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-symp-blue shadow-md p-4">
        <h1 className="text-3xl font-bold text-center text-white">Symptalk</h1>
      </header>
      {mode === "chat" ? (
        <ChatUI
          messages={messages}
          messagesEndRef={messagesEndRef}
          input={input}
          handleInputChange={(e) => setInput(e.target.value)}
          handleSubmit={handleSubmit}
          switchToVoiceMode={() => setMode("voice")}
        />
      ) : (
        <VoiceUI
          isRecording={isRecording}
          isProcessing={isProcessing}
          isMuted={isMuted}
          toggleMute={() => setIsMuted(!isMuted)}
          toggleRecording={toggleRecording}
          switchToChatMode={() => setMode("chat")}
          selectedModel={ttsModel}
          onModelChange={(model) => setTtsModel(model)}
        />
      )}
      <audio ref={audioRef} />
    </main>
  );
}
