"use client";

import { useState } from "react";
import {
  Reply,
  Forward,
  Trash2,
  Star,
  Paperclip,
  Download,
  X,
  ReplyAll,
  ChevronDown,
  ChevronUp,
  MessagesSquare,
  Loader2,
} from "lucide-react";

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

interface EmailFull {
  id: string;
  uid: number;
  messageId: string;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  date: Date;
  preview: string;
  html?: string;
  text?: string;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
  attachments: EmailAttachment[];
}

interface EmailViewProps {
  email: EmailFull | null;
  thread?: EmailFull[];
  isLoading: boolean;
  folder: string;
  onReply: (email?: EmailFull) => void;
  onReplyAll: (email?: EmailFull) => void;
  onForward: (email?: EmailFull) => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onClose: () => void;
  onLoadThread?: () => void;
}

function ThreadMessage({
  email,
  folder,
  isLast,
  onReply,
  onReplyAll,
  onForward,
}: {
  email: EmailFull;
  folder: string;
  isLast: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(isLast);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={`border-b border-slate-200 ${isExpanded ? "" : "hover:bg-slate-50"}`}>
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left p-4 flex items-center gap-3 ${
          isExpanded ? "border-b border-slate-100" : ""
        }`}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {(email.from.name || email.from.address).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">
              {email.from.name || email.from.address}
            </span>
            <span className="text-xs text-slate-400">{formatDate(email.date)}</span>
          </div>
          {!isExpanded && (
            <p className="text-sm text-slate-500 truncate">
              {email.text?.substring(0, 100) || "No preview available"}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4">
          {/* Email meta */}
          <div className="mb-4 text-sm text-slate-600">
            <div>
              <span className="text-slate-400">From: </span>
              {email.from.name || email.from.address} &lt;{email.from.address}&gt;
            </div>
            <div>
              <span className="text-slate-400">To: </span>
              {email.to.map((t) => t.name || t.address).join(", ")}
            </div>
            {email.cc && email.cc.length > 0 && (
              <div>
                <span className="text-slate-400">Cc: </span>
                {email.cc.map((t) => t.name || t.address).join(", ")}
              </div>
            )}
            <div className="text-xs text-slate-400 mt-1">{formatFullDate(email.date)}</div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={onReply} className="btn-ghost text-xs px-2 py-1">
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </button>
            <button onClick={onReplyAll} className="btn-ghost text-xs px-2 py-1">
              <ReplyAll className="w-3 h-3 mr-1" />
              Reply All
            </button>
            <button onClick={onForward} className="btn-ghost text-xs px-2 py-1">
              <Forward className="w-3 h-3 mr-1" />
              Forward
            </button>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {email.attachments.length} attachment
                  {email.attachments.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={`/api/mail/attachments/${email.uid}?folder=${encodeURIComponent(folder)}&index=${i}`}
                    download={att.filename}
                    className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-amber-200 rounded text-xs text-slate-700 hover:bg-amber-100 transition-colors"
                  >
                    <Download className="w-3 h-3 text-amber-600" />
                    <span className="truncate max-w-[120px]">{att.filename}</span>
                    <span className="text-slate-400">({formatSize(att.size)})</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="prose prose-sm prose-slate max-w-none prose-img:max-w-full prose-a:text-sky-600">
            {email.html ? (
              <div dangerouslySetInnerHTML={{ __html: email.html }} />
            ) : (
              <pre className="whitespace-pre-wrap text-slate-700 font-sans text-sm leading-relaxed">
                {email.text}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailView({
  email,
  thread,
  isLoading,
  folder,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleStar,
  onClose,
  onLoadThread,
}: EmailViewProps) {
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  const handleLoadThread = async () => {
    if (onLoadThread) {
      setIsLoadingThread(true);
      await onLoadThread();
      setIsLoadingThread(false);
    }
  };
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="skeleton h-8 w-96 mb-4" />
        <div className="skeleton h-4 w-48 mb-2" />
        <div className="skeleton h-4 w-32 mb-6" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-slate-400"
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
          <p className="text-slate-500 font-medium">Select an email to read</p>
          <p className="text-slate-400 text-sm mt-1">
            Click on an email from the list
          </p>
        </div>
      </div>
    );
  }

  // Use thread if available, otherwise show single email
  const displayThread = thread && thread.length > 0 ? thread : [email];
  const isThreadView = displayThread.length > 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 truncate pr-4">
              {email.subject}
            </h1>
            {isThreadView ? (
              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full">
                {displayThread.length} messages
              </span>
            ) : onLoadThread && (
              <button
                onClick={handleLoadThread}
                disabled={isLoadingThread}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors disabled:opacity-50"
                title="Load conversation thread"
              >
                {isLoadingThread ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <MessagesSquare className="w-3 h-3" />
                )}
                {isLoadingThread ? "Loading..." : "Load thread"}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => onReply()} className="btn-secondary text-sm">
            <Reply className="w-4 h-4 mr-1.5" />
            Reply
          </button>
          <button onClick={() => onReplyAll()} className="btn-secondary text-sm">
            <ReplyAll className="w-4 h-4 mr-1.5" />
            Reply All
          </button>
          <button onClick={() => onForward()} className="btn-secondary text-sm">
            <Forward className="w-4 h-4 mr-1.5" />
            Forward
          </button>
          <div className="flex-1" />
          <button onClick={onToggleStar} className="btn-ghost p-2">
            <Star
              className={`w-5 h-5 ${
                email.isStarred
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-400"
              }`}
            />
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost p-2 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Thread View or Single Email */}
      {isThreadView ? (
        <div className="flex-1 overflow-y-auto">
          {displayThread.map((threadEmail, index) => (
            <ThreadMessage
              key={threadEmail.id}
              email={threadEmail}
              folder={folder}
              isLast={index === displayThread.length - 1}
              onReply={() => onReply(threadEmail)}
              onReplyAll={() => onReplyAll(threadEmail)}
              onForward={() => onForward(threadEmail)}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Single Email Meta */}
          <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(email.from.name || email.from.address).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">
                    {email.from.name || email.from.address}
                  </span>
                  <span className="text-sm text-slate-500 truncate">
                    &lt;{email.from.address}&gt;
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  To: {email.to.map((t) => t.name || t.address).join(", ")}
                  {email.cc && email.cc.length > 0 && (
                    <span className="ml-2">
                      Cc: {email.cc.map((t) => t.name || t.address).join(", ")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {formatDate(email.date)}
                </div>
              </div>
            </div>
          </div>

          {/* Single Email Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {email.attachments.length} attachment
                  {email.attachments.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={`/api/mail/attachments/${email.uid}?folder=${encodeURIComponent(folder)}&index=${i}`}
                    download={att.filename}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-slate-700 hover:bg-amber-100 transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-600" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-xs text-slate-500">
                      ({formatSize(att.size)})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Single Email Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {email.html ? (
              <div
                className="prose prose-slate max-w-none prose-img:max-w-full prose-a:text-sky-600"
                dangerouslySetInnerHTML={{ __html: email.html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-slate-700 font-sans text-sm leading-relaxed">
                {email.text}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}
