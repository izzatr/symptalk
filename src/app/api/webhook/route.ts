import { NextRequest, NextResponse } from "next/server";
import { messages, Message } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

interface WebhookRequest {
  text: string;
  sessionId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { text, sessionId } = (await req.json()) as WebhookRequest;

    if (!text || !sessionId) {
      return NextResponse.json(
        { error: "Missing text or sessionId" },
        { status: 400 }
      );
    }

    if (!messages[sessionId]) {
      messages[sessionId] = [];
    }

    const botMessage: Message = { id: uuidv4(), role: "bot", text };
    messages[sessionId].push(botMessage);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 