"use client";

import { ReactNode } from "react";

export type Status = "idle" | "recording" | "processing" | "playing" | "error";

interface StatusIndicatorProps {
  status: Status;
  errorMessage?: string;
}

const statusConfig: Record<Status, { label: string; color: string; icon: ReactNode }> = {
  idle: {
    label: "Ready",
    color: "text-gray-500 dark:text-gray-400",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    ),
  },
  recording: {
    label: "Listening...",
    color: "text-red-500",
    icon: (
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
    ),
  },
  processing: {
    label: "Thinking...",
    color: "text-blue-500",
    icon: (
      <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
  },
  playing: {
    label: "Speaking...",
    color: "text-green-500",
    icon: (
      <div className="flex items-center gap-0.5">
        <span className="w-1 h-3 bg-current rounded-full animate-[bounce_0.6s_ease-in-out_infinite]"></span>
        <span className="w-1 h-4 bg-current rounded-full animate-[bounce_0.6s_ease-in-out_0.1s_infinite]"></span>
        <span className="w-1 h-3 bg-current rounded-full animate-[bounce_0.6s_ease-in-out_0.2s_infinite]"></span>
        <span className="w-1 h-5 bg-current rounded-full animate-[bounce_0.6s_ease-in-out_0.3s_infinite]"></span>
        <span className="w-1 h-3 bg-current rounded-full animate-[bounce_0.6s_ease-in-out_0.4s_infinite]"></span>
      </div>
    ),
  },
  error: {
    label: "Error",
    color: "text-red-500",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export default function StatusIndicator({ status, errorMessage }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={`flex flex-col items-center gap-2 ${config.color}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span className="text-lg font-medium">{config.label}</span>
      </div>
      {status === "error" && errorMessage && (
        <p className="text-sm text-center max-w-xs">{errorMessage}</p>
      )}
    </div>
  );
}
