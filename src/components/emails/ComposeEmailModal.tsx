"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, EmailTemplate } from "@/db/schema";

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSuccess?: () => void;
}

export function ComposeEmailModal({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ComposeEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load templates
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/templates")
        .then((res) => res.json())
        .then((data) => {
          setTemplates(data.filter((t: EmailTemplate) => t.isActive));
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId("");
      setSubject("");
      setHtmlContent("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Handle template selection
  const handleTemplateChange = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (templateId) {
        const template = templates.find((t) => t.id === templateId);
        if (template) {
          setSubject(template.subject);
          setHtmlContent(template.htmlContent);
        }
      } else {
        setSubject("");
        setHtmlContent("");
      }
    },
    [templates]
  );

  // Personalize preview
  const personalizePreview = (content: string): string => {
    return content
      .replace(/\{\{company_name\}\}/g, client.companyName || "there")
      .replace(/\{\{email\}\}/g, client.email || "")
      .replace(/\{\{city\}\}/g, client.city || "")
      .replace(/\{\{category\}\}/g, client.category || "")
      .replace(/\{\{website\}\}/g, client.website || "")
      .replace(/\{\{phone\}\}/g, client.phonePrimary || "");
  };

  // Send email
  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      setError("Subject and content are required");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          subject,
          htmlContent,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Send Email
                </h2>
                <p className="text-sm text-slate-500">
                  To: {client.companyName || client.email}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-emerald-700 font-medium">
                  Email sent successfully!
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Template (optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="select-field w-full"
                disabled={isLoading}
              >
                <option value="">Custom email (no template)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="input-field"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content (HTML)
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Enter email content..."
                rows={8}
                className="input-field font-mono text-sm"
              />
            </div>

            {/* Variables Helper */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Available variables:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "{{company_name}}",
                  "{{email}}",
                  "{{city}}",
                  "{{category}}",
                  "{{website}}",
                  "{{phone}}",
                ].map((variable) => (
                  <code
                    key={variable}
                    className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 cursor-pointer hover:bg-sky-50 hover:border-sky-300 transition-colors"
                    onClick={() => setHtmlContent((prev) => prev + variable)}
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </div>

            {/* Preview */}
            {htmlContent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preview
                </label>
                <div className="border border-slate-200 rounded-xl p-4 bg-white max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium text-slate-900 mb-2">
                    Subject: {personalizePreview(subject)}
                  </p>
                  <div
                    className="text-sm text-slate-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: personalizePreview(htmlContent),
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || success || !subject.trim() || !htmlContent.trim()}
              className="btn-primary"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
