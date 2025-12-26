"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { EmailTemplate } from "@/db/schema";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const TEMPLATE_VARIABLES = [
  { key: "company_name", label: "Company Name", fallback: "there" },
  { key: "email", label: "Email", fallback: "" },
  { key: "city", label: "City", fallback: "" },
  { key: "category", label: "Category", fallback: "" },
  { key: "website", label: "Website", fallback: "" },
  { key: "phone", label: "Phone", fallback: "" },
];

export default function TemplateEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";
  const router = useRouter();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isNew) return;

    fetch(`/api/templates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: EmailTemplate) => {
        setTemplate(data);
        setName(data.name);
        setSubject(data.subject);
        setHtmlContent(data.htmlContent);
      })
      .catch(() => router.push("/templates"))
      .finally(() => setIsLoading(false));
  }, [id, router, isNew]);

  useEffect(() => {
    if (isNew) {
      setHasChanges(name.trim() !== "" || subject.trim() !== "" || htmlContent.trim() !== "");
      return;
    }
    if (!template) return;
    const changed =
      name !== template.name ||
      subject !== template.subject ||
      htmlContent !== template.htmlContent;
    setHasChanges(changed);
  }, [name, subject, htmlContent, template, isNew]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      alert("Name and subject are required");
      return;
    }

    setIsSaving(true);
    try {
      const usedVariables = TEMPLATE_VARIABLES.filter(
        (v) =>
          htmlContent.includes(`{{${v.key}}}`) ||
          subject.includes(`{{${v.key}}}`)
      ).map((v) => v.key);

      if (isNew) {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subject,
            htmlContent,
            variables: usedVariables,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          router.push(`/templates/${created.id}`);
        }
      } else {
        const res = await fetch(`/api/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            subject,
            htmlContent,
            variables: usedVariables,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          setTemplate(updated);
          setHasChanges(false);
        }
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch(`/api/templates/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      if (res.ok) {
        alert(`Test email sent to ${testEmail}`);
        setShowTestModal(false);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to send test email");
      }
    } catch (error) {
      console.error("Failed to send test:", error);
    } finally {
      setIsSendingTest(false);
    }
  };

  const insertVariable = (variable: string, target: "subject" | "content") => {
    const variableText = `{{${variable}}}`;
    if (target === "subject") {
      setSubject(subject + variableText);
    } else {
      setHtmlContent(htmlContent + variableText);
    }
  };

  const getPreviewContent = () => {
    let preview = htmlContent;
    TEMPLATE_VARIABLES.forEach((v) => {
      preview = preview.replace(
        new RegExp(`\\{\\{${v.key}\\}\\}`, "g"),
        `<span class="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-sm font-medium">${v.label}</span>`
      );
    });
    return preview;
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link", "image"],
      ["clean"],
    ],
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div>
              <div className="skeleton h-7 w-48 mb-2" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="skeleton h-96 rounded-xl" />
            <div className="skeleton h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!template && !isNew) {
    return (
      <div className="p-6">
        <div className="empty-state py-16">
          <div className="icon-container icon-container-lg mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Template not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/templates")}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isNew ? "Create Template" : "Edit Template"}
            </h1>
            {hasChanges && !isNew && (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {!isNew && (
            <button
              onClick={() => setShowTestModal(true)}
              className="btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Test
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || (!isNew && !hasChanges)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isNew ? "Creating..." : "Saving..."}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isNew ? "M12 4v16m8-8H4" : "M5 13l4 4L19 7"} />
                </svg>
                {isNew ? "Create Template" : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Side */}
        <div className="space-y-4">
          {/* Template Name */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="input-field"
            />
          </div>

          {/* Subject Line */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Subject Line</label>
              <div className="flex gap-1">
                {TEMPLATE_VARIABLES.slice(0, 3).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key, "subject")}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title={`Insert {{${v.key}}}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Special offer for {{company_name}}"
              className="input-field"
            />
          </div>

          {/* Variables */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Insert Variable</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHtmlMode(!isHtmlMode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isHtmlMode
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  HTML Mode
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key, "content")}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:border-sky-300 hover:text-sky-600 transition-colors font-mono"
                >
                  {"{{" + v.key + "}}"}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="card overflow-hidden">
            {isHtmlMode ? (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm focus:outline-none border-0 resize-none bg-slate-50"
                placeholder="Enter HTML content..."
              />
            ) : (
              <div className="template-editor">
                <ReactQuill
                  value={htmlContent}
                  onChange={setHtmlContent}
                  modules={quillModules}
                  className="h-96"
                  theme="snow"
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview Side */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  previewMode === "desktop"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  previewMode === "mobile"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile
              </button>
            </div>
          </div>

          <div
            className={`card overflow-hidden transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
            }`}
          >
            {/* Email Header */}
            <div className="border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Subject:
              </div>
              <div className="font-medium text-slate-900">{subject || "No subject"}</div>
            </div>

            {/* Email Body */}
            <div
              className="p-6 min-h-[400px] prose prose-sm max-w-none bg-white"
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="modal-backdrop" onClick={() => setShowTestModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-container">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Send Test Email</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Send a test email to preview how your template looks in an inbox.
              Variables will be replaced with sample data.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="btn-primary disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
