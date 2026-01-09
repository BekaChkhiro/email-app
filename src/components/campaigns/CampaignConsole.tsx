"use client";

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  id: string;
  level: "info" | "success" | "warning" | "error";
  event: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface CampaignConsoleProps {
  logs: LogEntry[];
  isLoading?: boolean;
}

const levelIcons: Record<string, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
};

const levelColors: Record<string, string> = {
  info: "log-info",
  success: "log-success",
  warning: "log-warning",
  error: "log-error",
};

export function CampaignConsole({ logs, isLoading }: CampaignConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "error" | "success">("all");
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (consoleRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "error") return log.level === "error";
    if (filter === "success") return log.level === "success";
    return true;
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const copyLogs = () => {
    const text = filteredLogs
      .map((log) => `[${formatTime(log.createdAt)}] ${levelIcons[log.level]} ${log.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="campaign-console-wrapper">
      <div className="console-header">
        <span className="console-title">Console</span>
        <div className="console-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "error" | "success")}
            className="console-filter"
          >
            <option value="all">All</option>
            <option value="error">Errors</option>
            <option value="success">Success</option>
          </select>
          <button onClick={copyLogs} className="console-btn" title="Copy logs">
            Copy
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`console-btn ${autoScroll ? "active" : ""}`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            {autoScroll ? "↓ Auto" : "↓ Manual"}
          </button>
        </div>
      </div>
      <div
        ref={consoleRef}
        className="campaign-console"
        onScroll={handleScroll}
      >
        {isLoading && logs.length === 0 ? (
          <div className="console-empty">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="console-empty">
            {filter === "all"
              ? "No logs yet. Logs will appear here when the campaign processes emails."
              : `No ${filter} logs found.`}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`log-entry ${levelColors[log.level]}`}>
              <span className="log-timestamp">[{formatTime(log.createdAt)}]</span>
              <span className="log-icon">{levelIcons[log.level]}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
      {filteredLogs.length > 0 && (
        <div className="console-footer">
          {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""}
          {filter !== "all" && ` (filtered from ${logs.length})`}
        </div>
      )}
    </div>
  );
}
