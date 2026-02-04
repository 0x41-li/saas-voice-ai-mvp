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
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-4">
      <main className="flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Voice Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
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
