"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isDisabled: boolean;
  maxDuration?: number;
}

export default function VoiceButton({
  onRecordingComplete,
  isDisabled,
  maxDuration = 20,
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const getMimeType = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/wav",
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "audio/webm";
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
  }, []);

  const startRecording = useCallback(async () => {
    if (isDisabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (blob.size > 0) {
          onRecordingComplete(blob);
        }
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setPermissionDenied(false);

      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      if ((error as Error).name === "NotAllowedError") {
        setPermissionDenied(true);
      }
    }
  }, [isDisabled, maxDuration, onRecordingComplete, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isDisabled && !isRecording) {
      startRecording();
    }
  };

  const handlePointerUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const handlePointerLeave = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const progressPercent = (duration / maxDuration) * 100;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Progress ring */}
        <svg
          className="absolute inset-0 -rotate-90 w-32 h-32"
          viewBox="0 0 128 128"
        >
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          {isRecording && (
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${progressPercent * 3.64} 364`}
              className="text-red-500 transition-all duration-100"
            />
          )}
        </svg>

        {/* Main button */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isDisabled}
          className={`
            relative w-32 h-32 rounded-full
            flex items-center justify-center
            transition-all duration-200
            touch-none select-none
            ${
              isDisabled
                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                : isRecording
                ? "bg-red-500 scale-110"
                : "bg-blue-500 hover:bg-blue-600 active:scale-95"
            }
          `}
        >
          {/* Mic icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className={`w-12 h-12 ${isRecording ? "animate-pulse" : ""}`}
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
      </div>

      {/* Duration display */}
      {isRecording && (
        <div className="text-lg font-mono text-red-500">
          {duration.toFixed(1)}s / {maxDuration}s
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isDisabled && (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Hold to record
        </p>
      )}

      {/* Permission denied message */}
      {permissionDenied && (
        <p className="text-red-500 text-sm text-center max-w-xs">
          Microphone access denied. Please enable it in your browser settings.
        </p>
      )}
    </div>
  );
}
