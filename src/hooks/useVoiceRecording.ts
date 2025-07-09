"use client";

import { useState, useEffect, useRef } from "react";

export function useVoiceRecording(
  ws: React.MutableRefObject<WebSocket | null>,
  isMuted: boolean,
  ttsModel: string
) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          !isMuted &&
          ws.current?.readyState === WebSocket.OPEN
        ) {
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

        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({ type: "stop_recording", ttsModel: ttsModel })
          );
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

    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop());
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

  return {
    isRecording,
    isProcessing,
    setIsProcessing,
    startRecording,
    stopRecording,
    toggleRecording,
    cleanup,
  };
} 