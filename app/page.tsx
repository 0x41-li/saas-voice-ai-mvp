"use client";

import { useState, useRef, useCallback } from "react";
import VoiceButton from "@/components/VoiceButton";
import StatusIndicator, { Status } from "@/components/StatusIndicator";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getAudioFormat = (mimeType: string): string => {
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const playAudio = useCallback(async (base64Audio: string, format: string = "mp3") => {
    try {
      setStatus("playing");

      // Decode base64 to blob
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
      const audioBlob = new Blob([audioArray], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus("idle");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus("error");
        setErrorMessage("Failed to play audio response");
      };

      await audio.play();
    } catch (error) {
      console.error("Playback error:", error);
      setStatus("error");
      setErrorMessage("Could not play audio. Tap to retry.");
    }
  }, []);

  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob) => {
      setStatus("processing");
      setErrorMessage("");

      try {
        const base64Audio = await blobToBase64(audioBlob);
        const format = getAudioFormat(audioBlob.type);

        const response = await fetch("/api/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: base64Audio,
            format: format,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process voice");
        }

        const data = await response.json();

        if (data.audio) {
          await playAudio(data.audio, data.audioFormat || "mp3");
        } else {
          throw new Error("No audio response received");
        }
      } catch (error) {
        console.error("Error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong"
        );

        // Auto-reset to idle after 3 seconds
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage("");
        }, 3000);
      }
    },
    [playAudio]
  );

  const isDisabled = status === "processing" || status === "playing";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-br from-violet-950 via-slate-900 to-slate-950 p-4">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Voice Assistant
          </h1>
          <p className="text-white/60 text-sm">
            Hold the button to speak
          </p>
        </div>

        {/* Voice Button */}
        <VoiceButton
          onRecordingComplete={handleRecordingComplete}
          isDisabled={isDisabled}
          maxDuration={20}
        />

        {/* Status Indicator */}
        <StatusIndicator status={status} errorMessage={errorMessage} />
      </main>
    </div>
  );
}
