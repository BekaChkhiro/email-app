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
  const router = useRouter();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
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
  }, [id, router]);

  useEffect(() => {
    if (!template) return;
    const changed =
      name !== template.name ||
      subject !== template.subject ||
      htmlContent !== template.htmlContent;
    setHasChanges(changed);
  }, [name, subject, htmlContent, template]);

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
        `<span class="bg-blue-100 text-blue-700 px-1 rounded">${v.label}</span>`
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6 text-center">
        <p>Template not found</p>
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
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">Edit Template</h1>
            {hasChanges && (
              <span className="text-sm text-orange-600">Unsaved changes</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Send Test
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Side */}
        <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Subject Line</label>
              <div className="flex gap-1">
                {TEMPLATE_VARIABLES.slice(0, 3).map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key, "subject")}
                    className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded"
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Variables */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Insert Variable:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsHtmlMode(!isHtmlMode)}
                  className={`px-2 py-1 text-xs rounded ${
                    isHtmlMode ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  HTML
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key, "content")}
                  className="px-2 py-1 text-xs bg-white border rounded hover:border-blue-500 hover:text-blue-600"
                >
                  {"{{" + v.key + "}}"}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="border rounded-lg overflow-hidden">
            {isHtmlMode ? (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm focus:outline-none"
                placeholder="Enter HTML content..."
              />
            ) : (
              <ReactQuill
                value={htmlContent}
                onChange={setHtmlContent}
                modules={quillModules}
                className="h-96"
                theme="snow"
              />
            )}
          </div>
        </div>

        {/* Preview Side */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`px-3 py-1 text-sm rounded ${
                  previewMode === "desktop" ? "bg-white shadow-sm" : ""
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`px-3 py-1 text-sm rounded ${
                  previewMode === "mobile" ? "bg-white shadow-sm" : ""
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          <div
            className={`border rounded-lg bg-white overflow-hidden ${
              previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
            }`}
          >
            {/* Email Header */}
            <div className="border-b p-4 bg-gray-50">
              <div className="text-sm text-gray-500 mb-1">Subject:</div>
              <div className="font-medium">{subject || "No subject"}</div>
            </div>

            {/* Email Body */}
            <div
              className="p-6 min-h-[400px] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
            />
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a test email to preview how your template looks in an inbox.
              Variables will be replaced with sample data.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSendingTest ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
