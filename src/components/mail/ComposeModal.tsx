"use client";

import { useState, useEffect, useRef } from "react";
import { X, Paperclip, Trash2, Send, Minimize2, Maximize2 } from "lucide-react";

interface EmailFull {
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  html?: string;
  text?: string;
  messageId?: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: EmailFull | null;
  forwardEmail?: EmailFull | null;
  replyAll?: boolean;
  onSent: () => void;
}

interface Attachment {
  file: File;
  name: string;
  size: number;
}

export function ComposeModal({
  isOpen,
  onClose,
  replyTo,
  forwardEmail,
  replyAll = false,
  onSent,
}: ComposeModalProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill for reply/forward
  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.from.address);
      if (replyAll && replyTo.to) {
        const ccAddresses = replyTo.to
          .map((t) => t.address)
          .filter((addr) => addr !== replyTo.from.address)
          .join(", ");
        if (ccAddresses) {
          setCc(ccAddresses);
          setShowCcBcc(true);
        }
      }
      setSubject(`Re: ${replyTo.subject.replace(/^Re:\s*/i, "")}`);
      const originalText = replyTo.text || "";
      const quotedText = originalText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      setBody(
        `\n\n---\nOn ${new Date().toLocaleDateString()}, ${
          replyTo.from.name || replyTo.from.address
        } wrote:\n${quotedText}`
      );
    } else if (forwardEmail) {
      setTo("");
      setSubject(`Fwd: ${forwardEmail.subject.replace(/^Fwd:\s*/i, "")}`);
      const originalText = forwardEmail.text || "";
      setBody(
        `\n\n---------- Forwarded message ----------\nFrom: ${
          forwardEmail.from.name || forwardEmail.from.address
        } <${forwardEmail.from.address}>\nSubject: ${
          forwardEmail.subject
        }\n\n${originalText}`
      );
    } else {
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
    }
    setAttachments([]);
    setError(null);
  }, [replyTo, forwardEmail, replyAll, isOpen]);

  const handleSend = async () => {
    if (!to) {
      setError("Please enter at least one recipient");
      return;
    }
    if (!subject) {
      setError("Please enter a subject");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Prepare attachments
      const attachmentData = [];
      for (const att of attachments) {
        const buffer = await att.file.arrayBuffer();
        attachmentData.push({
          filename: att.name,
          content: Buffer.from(buffer).toString("base64"),
          contentType: att.file.type,
        });
      }

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.split(",").map((s) => s.trim()),
          cc: cc ? cc.split(",").map((s) => s.trim()) : undefined,
          bcc: bcc ? bcc.split(",").map((s) => s.trim()) : undefined,
          subject,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap;">${body.replace(
            /\n/g,
            "<br>"
          )}</div>`,
          text: body,
          attachments: attachmentData.length > 0 ? attachmentData : undefined,
          inReplyTo: replyTo?.messageId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter((f) => f.size <= maxSize);
    const oversizedFiles = files.filter((f) => f.size > maxSize);

    if (oversizedFiles.length > 0) {
      setError(
        `Some files were too large (max 10MB): ${oversizedFiles
          .map((f) => f.name)
          .join(", ")}`
      );
    }

    setAttachments((prev) => [
      ...prev,
      ...validFiles.map((f) => ({ file: f, name: f.name, size: f.size })),
    ]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-72 bg-white rounded-t-xl shadow-2xl border border-slate-200 z-50">
        <div
          className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-xl cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <span className="font-medium truncate">
            {subject || "New Message"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-xl">
          <span className="font-medium">
            {replyTo ? "Reply" : forwardEmail ? "Forward" : "New Message"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-slate-700 rounded"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          {/* To */}
          <div className="flex items-center border-b border-slate-200 px-4">
            <span className="text-sm text-slate-500 w-12">To</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipients"
              className="flex-1 py-2.5 outline-none text-sm"
            />
            <button
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cc/Bcc
            </button>
          </div>

          {/* Cc/Bcc */}
          {showCcBcc && (
            <>
              <div className="flex items-center border-b border-slate-200 px-4">
                <span className="text-sm text-slate-500 w-12">Cc</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Carbon copy"
                  className="flex-1 py-2.5 outline-none text-sm"
                />
              </div>
              <div className="flex items-center border-b border-slate-200 px-4">
                <span className="text-sm text-slate-500 w-12">Bcc</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Blind carbon copy"
                  className="flex-1 py-2.5 outline-none text-sm"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center border-b border-slate-200 px-4">
            <span className="text-sm text-slate-500 w-12">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 py-2.5 outline-none text-sm"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            className="w-full p-4 min-h-[200px] outline-none resize-none text-sm"
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm"
                >
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <span className="text-xs text-slate-500">
                    ({formatSize(att.size)})
                  </span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 hover:bg-slate-200 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost p-2"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost p-2" title="Discard">
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !to || !subject}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
