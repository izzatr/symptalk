const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");
const { fal } = require("@fal-ai/client");
const { FormData, Blob } = require("formdata-node");

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = process.env.PORT || 3000;

const nextConfig = dev ? { dev, hostname, port } : { dev };

const app = next(nextConfig);
const handle = app.getRequestHandler();

// In-memory store for messages
const clients = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;
      if (pathname === "/webhook-ws" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const { sessionId, ...payload } = JSON.parse(body);
            const ws = clients.get(sessionId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "bot_message", data: payload }));
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            console.error("Error processing webhook:", e);
            res.writeHead(500);
            res.end("Internal Server Error");
          }
        });
        return; // Important: Stop further processing
      }
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

    clients.set(sessionId, ws);
    console.log(`Client connected with sessionId: ${sessionId}`);

    let audioBuffer = [];

    ws.on("message", async (message) => {
      try {
        // Check if it's a JSON message (control message)
        const messageStr = message.toString();
        if (messageStr.startsWith("{")) {
          const data = JSON.parse(messageStr);

          if (data.type === "stop_recording") {
            // Process accumulated audio when recording stops
            if (audioBuffer.length > 0) {
              await processAudio(audioBuffer, sessionId, ws, data.ttsModel);
              audioBuffer = []; // Clear buffer after processing
            }
          } else if (data.type === "chat_message") {
            // New: Handle incoming chat messages from the client
            const n8nWebhookUrl =
              process.env.N8N_WEBHOOK_URL ||
              "https://n8n-symptalk.zeabur.app/webhook/chat-room";
            await fetch(n8nWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                text: data.text,
                mode: data.mode,
              }),
            });
          }
        } else {
          // It's audio data - add to buffer
          audioBuffer.push(message);
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    });

    ws.on("close", async () => {
      clients.delete(sessionId);
      console.log(`Client disconnected with sessionId: ${sessionId}`);
      // Process any remaining audio on disconnect
      if (audioBuffer.length > 0) {
        await processAudio(audioBuffer, sessionId, ws);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Function to process audio and send to n8n
    async function processAudio(audioChunks, sessionId, ws, ttsModel = "A") {
      try {
        console.log(
          `Processing audio for session ${sessionId}, chunks: ${audioChunks.length}`
        );

        // Convert audio chunks to a single Buffer
        const audioBuffer = Buffer.concat(audioChunks);

        // Create a proper Blob
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

        // Upload the blob directly
        const audioUrl = await fal.storage.upload(audioBlob);

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

        // Send transcript back to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "transcript", text: transcript }));
        }

        // Send to n8n workflow
        const n8nWebhookUrl =
          process.env.N8N_WEBHOOK_URL ||
          "https://n8n-symptalk.zeabur.app/webhook/chat-room";
        await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            text: transcript,
            mode: "voice",
            ttsModel: ttsModel,
          }),
        });

        console.log(`Sent transcript to n8n for session ${sessionId}`);
      } catch (error) {
        console.error("Error processing audio:", error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to process audio",
            })
          );
        }
      }
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
