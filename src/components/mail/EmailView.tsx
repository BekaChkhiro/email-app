"use client";

import {
  Reply,
  Forward,
  Trash2,
  Star,
  Paperclip,
  Download,
  X,
  ReplyAll,
} from "lucide-react";

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

interface EmailFull {
  id: string;
  uid: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  date: Date;
  html?: string;
  text?: string;
  hasAttachments: boolean;
  isStarred: boolean;
  attachments: EmailAttachment[];
}

interface EmailViewProps {
  email: EmailFull | null;
  isLoading: boolean;
  folder: string;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onClose: () => void;
}

export function EmailView({
  email,
  isLoading,
  folder,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onToggleStar,
  onClose,
}: EmailViewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-900 truncate pr-4">
            {email.subject}
          </h1>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={onReply} className="btn-secondary text-sm">
            <Reply className="w-4 h-4 mr-1.5" />
            Reply
          </button>
          <button onClick={onReplyAll} className="btn-secondary text-sm">
            <ReplyAll className="w-4 h-4 mr-1.5" />
            Reply All
          </button>
          <button onClick={onForward} className="btn-secondary text-sm">
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

      {/* Email Meta */}
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

      {/* Attachments */}
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

      {/* Body */}
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
    </div>
  );
}
