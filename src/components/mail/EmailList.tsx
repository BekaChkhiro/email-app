"use client";

import { Star, Paperclip, Trash2 } from "lucide-react";

interface EmailMessage {
  id: string;
  uid: number;
  subject: string;
  from: { name: string; address: string };
  date: Date;
  preview: string;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
}

interface EmailListProps {
  messages: EmailMessage[];
  selectedId?: string;
  isLoading: boolean;
  onSelect: (uid: number) => void;
  onToggleStar: (uid: number) => void;
  onDelete: (uid: number) => void;
}

export function EmailList({
  messages,
  selectedId,
  isLoading,
  onSelect,
  onToggleStar,
  onDelete,
}: EmailListProps) {
  const formatEmailDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (diff < 2 * oneDay) {
      return "Yesterday";
    }

    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="skeleton w-5 h-5 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-4 w-32 mb-2" />
                <div className="skeleton h-3 w-48 mb-1" />
                <div className="skeleton h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No emails</p>
          <p className="text-slate-400 text-sm mt-1">This folder is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          onClick={() => onSelect(message.uid)}
          className={`group px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
            selectedId === message.id
              ? "bg-sky-50 border-l-2 border-l-sky-500"
              : message.isRead
              ? "hover:bg-slate-50"
              : "bg-white hover:bg-slate-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Star */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(message.uid);
              }}
              className={`mt-0.5 transition-colors ${
                message.isStarred
                  ? "text-amber-400"
                  : "text-slate-300 hover:text-amber-400"
              }`}
            >
              <Star
                className="w-4 h-4"
                fill={message.isStarred ? "currentColor" : "none"}
              />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm truncate ${
                    !message.isRead
                      ? "font-semibold text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  {message.from.name || message.from.address}
                </span>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                  {formatEmailDate(message.date)}
                </span>
              </div>
              <div
                className={`text-sm truncate mb-0.5 ${
                  !message.isRead
                    ? "font-medium text-slate-800"
                    : "text-slate-600"
                }`}
              >
                {message.subject}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {message.preview}
              </div>
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-1">
              {message.hasAttachments && (
                <Paperclip className="w-4 h-4 text-slate-400" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(message.uid);
                }}
                className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
