"use client";

import { useState, useEffect, useRef } from "react";

export function useVoiceRecording(sessionId: string, isMuted: boolean, onTranscript?: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      if (ws.current) {
        ws.current.close();
      }
      
      // Create WebSocket connection
      ws.current = new WebSocket(`ws://localhost:3000/ws?sessionId=${sessionId}`);
      
      ws.current.onopen = () => {
        console.log("WebSocket connection established");
      };
      
      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      // Handle messages from server
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          if (data.type === 'transcript') {
            console.log('Received transcript:', data.text);
            setIsProcessing(false);
            onTranscript?.(data.text);
          } else if (data.type === 'error') {
            console.error('Server error:', data.message);
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      // Get audio stream
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && !isMuted && ws.current?.readyState === WebSocket.OPEN) {
          console.log("Sending audio chunk, size:", event.data.size);
          ws.current.send(event.data);
        }
      };
      
      mediaRecorder.current.onstart = () => {
        console.log("Recording started");
        setIsRecording(true);
        setIsProcessing(false);
      };
      
      mediaRecorder.current.onstop = () => {
        console.log("Recording stopped");
        setIsRecording(false);
        setIsProcessing(true);
        
        // Send stop message to trigger transcription
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'stop_recording' }));
        }
      };
      
      mediaRecorder.current.start(500); // Send data every 500ms

    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cleanup = () => {
    console.log("Cleaning up recording resources...");
    setIsProcessing(false);
    setIsRecording(false);
    
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    if (stream.current) {
      stream.current.getTracks().forEach(track => track.stop());
      stream.current = null;
    }
  };
  
  useEffect(() => {
    if (stream.current) {
      const audioTrack = stream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted]);

  return { isRecording, isProcessing, startRecording, stopRecording, toggleRecording, cleanup };
} 