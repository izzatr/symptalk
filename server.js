const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");
const { fal } = require("@fal-ai/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory store for messages
const messages = {};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    // Only handle upgrades to our specific WebSocket path
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // For all other paths, let the default handling (or other servers) take over
      // Or explicitly destroy the socket if you know no other server should handle it.
      // For Next.js HMR, we should just ignore it and let Next handle it.
    }
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      ws.close(1008, "Session ID is required");
      return;
    }

    console.log(`Client connected with sessionId: ${sessionId}`);

    let audioBuffer = [];

    ws.on("message", (message) => {
      // Assuming the message is raw audio data (PCM)
      audioBuffer.push(message);
    });

    ws.on("close", async () => {
      console.log(`Client disconnected with sessionId: ${sessionId}`);
      if (audioBuffer.length > 0) {
        try {
          // The client sends audio chunks as blobs. We combine them into a single blob.
          // MediaRecorder in most browsers defaults to 'audio/webm;codecs=opus'.
          // fal-ai/wizper supports webm, so no conversion is needed.
          const audioBlob = new Blob(audioBuffer, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "audio.webm", { type: 'audio/webm' });

          const audioUrl = await fal.storage.upload(audioFile);
          const res = await fal.subscribe("fal-ai/wizper", {
            input: {
              audio_url: audioUrl,
              task: "transcribe",
              language: "en",
              version: "3",
            },
          });

          const transcript = res.data.text.trim();
          console.log("Transcript:", transcript);

          const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "https://n8n-symptalk.zeabur.app/webhook/chat-room";
          await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              text: transcript,
              mode: "voice",
            }),
          });
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      }
      audioBuffer = []; // Clear buffer for next connection
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 