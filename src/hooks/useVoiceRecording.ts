"use client";

import { useState, useEffect, useRef } from "react";

export function useVoiceRecording(sessionId: string, isMuted: boolean) {
  const [isRecording, setIsRecording] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  const SILENCE_THRESHOLD = 0.01; // RMS threshold for silence
  const SILENCE_DELAY = 2000; // 2 seconds of silence to stop recording

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      ws.current?.close();
      mediaRecorder.current?.stop();
      audioContext.current?.close();
    };
  }, []);

  const startRecording = async () => {
    if (ws.current) {
      ws.current.close();
    }
    ws.current = new WebSocket(`ws://localhost:3000/ws?sessionId=${sessionId}`);
    ws.current.onopen = () => {
      console.log("WebSocket connection established");
    };
    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new window.AudioContext();
      analyser.current = audioContext.current.createAnalyser();
      microphone.current = audioContext.current.createMediaStreamSource(stream);

      microphone.current.connect(analyser.current);

      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && !isMuted) {
          ws.current?.send(event.data);
        }
      };
      
      mediaRecorder.current.onstart = () => {
        setIsRecording(true);
        detectSilence();
      };
      
      mediaRecorder.current.onstop = () => {
        setIsRecording(false);
        ws.current?.close();
        stream.getTracks().forEach(track => track.stop());
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
        }
      };
      
      mediaRecorder.current.start(1000); // Send data every second

    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  const detectSilence = () => {
    if (!analyser.current) return;

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteTimeDomainData(dataArray);
    
    let sumSquares = 0.0;
    for (let i = 0; i < dataArray.length; i++) {
        const amplitude = dataArray[i];
        const val = (amplitude / 128.0) - 1.0;
        sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    console.log("RMS:", rms);

    if (rms < SILENCE_THRESHOLD) {
        if (!silenceTimer.current) {
            console.log("Silence detected, starting timer...");
            silenceTimer.current = setTimeout(() => {
                console.log("Silence timer ended, stopping recording.");
                stopRecording();
            }, SILENCE_DELAY);
        }
    } else {
        if (silenceTimer.current) {
            console.log("Sound detected, clearing timer.");
            clearTimeout(silenceTimer.current);
            silenceTimer.current = null;
        }
    }

    if (isRecording) {
        requestAnimationFrame(detectSilence);
    }
  };
  
  useEffect(() => {
    if (mediaRecorder.current?.stream) {
      const audioTrack = mediaRecorder.current.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted]);


  return { isRecording, startRecording, stopRecording };
} 