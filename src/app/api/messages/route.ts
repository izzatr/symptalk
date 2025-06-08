import { NextRequest, NextResponse } from "next/server";
import { messages } from "@/lib/store";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const botMessages = (messages[sessionId] || []).filter(
    (m) => m.role === "bot"
  );

  if (botMessages.length > 0) {
    // Clear bot messages after sending them
    messages[sessionId] = messages[sessionId].filter(
      (m) => m.role !== "bot"
    );
  }

  return NextResponse.json({ messages: botMessages });
} 