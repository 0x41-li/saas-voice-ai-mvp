"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onPressStart?: () => void;
  isDisabled: boolean;
  maxDuration?: number;
}

export default function VoiceButton({
  onRecordingComplete,
  onPressStart: onPressStartCallback,
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
  const isPressedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

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
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // User released button during permission prompt
      if (!isPressedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

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

  const handlePressEnd = useCallback(() => {
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    pointerIdRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      stopRecording();
    }
  }, [stopRecording]);

  // Listen for pointer-up on the entire document so that lifting the
  // finger *anywhere* on the screen ends the recording.
  // We intentionally ignore pointercancel — Chrome fires spurious cancels
  // on touch-action:none elements (text selection, multi-touch, etc.)
  // and the max-duration timer is our safety net.
  useEffect(() => {
    const onPointerUp = (e: PointerEvent) => {
      if (pointerIdRef.current !== null && e.pointerId === pointerIdRef.current) {
        handlePressEnd();
      }
    };

    // touchend is a fallback: if Chrome fires pointercancel, it won't
    // fire pointerup — but touchend still fires when the finger lifts.
    const onTouchEnd = () => {
      if (isPressedRef.current) {
        handlePressEnd();
      }
    };

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [handlePressEnd]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDisabled) return;
      e.preventDefault();
      pointerIdRef.current = e.pointerId;
      isPressedRef.current = true;
      onPressStartCallback?.();
      startRecording();
    },
    [isDisabled, onPressStartCallback, startRecording]
  );

  // When the page loses focus (permission dialog, app switch, incoming call,
  // notification, etc.) the finger is no longer holding the button.
  // Safari swallows pointerup/touchend during its permission dialog,
  // so this is the only reliable way to reset press state in that case.
  useEffect(() => {
    const onBlur = () => {
      isPressedRef.current = false;
      pointerIdRef.current = null;
    };

    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

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

  const progressPercent = (duration / maxDuration) * 100;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Outer glow effect when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-violet-500/40 blur-xl animate-pulse scale-150" />
            <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl animate-pulse scale-175 delay-75" />
          </>
        )}

        {/* Progress ring */}
        <svg
          className="absolute inset-0 -rotate-90 w-36 h-36"
          viewBox="0 0 144 144"
        >
          <circle
            cx="72"
            cy="72"
            r="66"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/10"
          />
          {isRecording && (
            <circle
              cx="72"
              cy="72"
              r="66"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 4.14} 414`}
              className="transition-all duration-100"
            />
          )}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Main button with glassmorphism */}
        <button
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => e.preventDefault()}
          className={`
            relative w-36 h-36 rounded-full
            flex items-center justify-center
            transition-all duration-300 ease-out
            select-none touch-none
            border border-white/20
            shadow-lg shadow-black/20
            ${
              isDisabled
                ? "bg-white/5 cursor-not-allowed opacity-50"
                : isRecording
                ? "bg-linear-to-br from-violet-500 to-pink-500 scale-105 shadow-violet-500/30 shadow-2xl"
                : "bg-white/10 backdrop-blur-sm hover:bg-white/15 hover:scale-102 active:scale-95"
            }
          `}
        >
          {/* Inner glow */}
          {!isDisabled && !isRecording && (
            <div className="absolute inset-2 rounded-full bg-linear-to-br from-violet-500/5 to-transparent" />
          )}

          {/* Mic icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`relative z-10 w-14 h-14 transition-all duration-300 ${
              isRecording ? "text-white scale-110" : "text-white/80"
            }`}
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
      </div>

      {/* Duration display */}
      {isRecording && (
        <div className="text-lg font-mono bg-linear-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent font-semibold">
          {duration.toFixed(1)}s / {maxDuration}s
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isDisabled && (
        <p className="text-white/40 text-sm">
          Hold to record
        </p>
      )}

      {/* Permission denied message */}
      {permissionDenied && (
        <p className="text-pink-400 text-sm text-center max-w-xs">
          Microphone access denied. Please enable it in your browser settings.
        </p>
      )}
    </div>
  );
}
