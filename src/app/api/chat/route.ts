import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "https://n8n-symptalk.zeabur.app/webhook/chat-room";

interface ChatRequest {
  text: string;
  sessionId: string;
  mode: "chat" | "voice";
}

export async function POST(req: NextRequest) {
  try {
    const { text, sessionId, mode } = (await req.json()) as ChatRequest;

    if (!text || !sessionId) {
      return NextResponse.json(
        { error: "Missing text or sessionId" },
        { status: 400 }
      );
    }

    // Forward the message to the n8n workflow
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, sessionId, mode }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 