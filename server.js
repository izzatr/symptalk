const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");
const { fal } = require("@fal-ai/client");
const { FormData, Blob } = require('formdata-node');

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = process.env.PORT || 3000;

const nextConfig = dev 
  ? { dev, hostname, port }
  : { dev };

const app = next(nextConfig);
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

    ws.on("message", async (message) => {
      try {
        // Check if it's a JSON message (control message)
        const messageStr = message.toString();
        if (messageStr.startsWith('{')) {
          const data = JSON.parse(messageStr);
          
          if (data.type === 'stop_recording') {
            // Process accumulated audio when recording stops
            if (audioBuffer.length > 0) {
              await processAudio(audioBuffer, sessionId, ws);
              audioBuffer = []; // Clear buffer after processing
            }
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
    async function processAudio(audioChunks, sessionId, ws) {
      const startTime = Date.now();
      const processingId = `${sessionId}-${startTime}`;
      
      try {
        console.log(`[${processingId}] Started processing audio for session ${sessionId}, chunks: ${audioChunks.length}`);
        
        // Convert audio chunks to a single Buffer
        const audioBuffer = Buffer.concat(audioChunks);
        const fileSizeKB = (audioBuffer.length / 1024).toFixed(2);
        console.log(`[${processingId}] Total audio size: ${fileSizeKB}KB`);
        
        // Create a proper Blob
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
        
        // Upload the blob (but use fal.run instead of fal.subscribe)
        const uploadStartTime = Date.now();
        console.log(`[${processingId}] Starting optimized upload...`);
        const audioUrl = await fal.storage.upload(audioBlob);
        const uploadDuration = Date.now() - uploadStartTime;
        console.log(`[${processingId}] Upload completed in ${uploadDuration}ms`);

        const transcriptionStartTime = Date.now();
        console.log(`[${processingId}] Starting transcription with fal.run...`);
        
        const res = await fal.run("fal-ai/wizper", {
          input: {
            audio_url: audioUrl,
            task: "transcribe",
            language: "en",
            version: "3",
          },
        });
        
        const transcriptionDuration = Date.now() - transcriptionStartTime;
        console.log(`[${processingId}] Transcription completed in ${transcriptionDuration}ms`);

        const transcript = res.data.text.trim();  // Correct path: res.data.text
        console.log(`[${processingId}] Transcript: "${transcript}"`);
        
        // Send transcript back to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'transcript', text: transcript }));
        }

        // Send to n8n workflow
        const n8nStartTime = Date.now();
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
        
        const totalProcessingTime = Date.now() - startTime;
        console.log(`[${processingId}] Request sent to n8n in ${Date.now() - n8nStartTime}ms. Total processing time: ${totalProcessingTime}ms`);
        
      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`[${processingId}] Error after ${totalTime}ms:`, error);
        
        // Log detailed error information
        if (error.body && error.body.detail) {
          console.error(`[${processingId}] Validation details:`, JSON.stringify(error.body.detail, null, 2));
        }
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: 'Failed to process audio' }));
        }
      }
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 