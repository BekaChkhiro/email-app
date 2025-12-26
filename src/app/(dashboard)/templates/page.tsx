"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailTemplate } from "@/db/schema";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const newTemplate = await res.json();
        setTemplates([newTemplate, ...templates]);
        router.push(`/templates/${newTemplate.id}`);
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="skeleton-heading mb-2" />
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="skeleton-button" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-36 bg-slate-100 animate-pulse" />
              <div className="p-4">
                <div className="skeleton h-5 w-32 mb-2" />
                <div className="skeleton h-4 w-48 mb-4" />
                <div className="flex justify-between">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Templates</h1>
          <p className="text-slate-500 mt-1">{templates.length} templates</p>
        </div>
        <Link href="/templates/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </Link>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="card">
          <div className="empty-state py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Create your first email template to use in campaigns
            </p>
            <Link href="/templates/new" className="btn-primary">
              Create your first template
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="card-hover overflow-hidden group"
            >
              {/* Preview Area */}
              <div
                className="h-36 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/60 overflow-hidden cursor-pointer relative"
                onClick={() => router.push(`/templates/${template.id}`)}
              >
                <div
                  className="text-xs text-slate-600 line-clamp-5 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: template.htmlContent.substring(0, 400),
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                  <span className="btn-secondary text-xs py-1.5 px-3">
                    View Template
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3
                  className="font-semibold text-slate-900 mb-1 cursor-pointer hover:text-sky-600 transition-colors truncate"
                  onClick={() => router.push(`/templates/${template.id}`)}
                >
                  {template.name}
                </h3>
                <p className="text-sm text-slate-500 truncate mb-3">
                  {template.subject}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(template.updatedAt)}
                  </span>
                  <span className={template.isActive ? "badge-success" : "badge-neutral"}>
                    <span className={`status-dot ${template.isActive ? "status-dot-success" : "bg-slate-400"}`}></span>
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => router.push(`/templates/${template.id}`)}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(template.id)}
                  className="btn-secondary text-sm py-2"
                  title="Duplicate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {deleteConfirm === template.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="btn-danger text-xs py-2 px-2"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="btn-secondary text-xs py-2 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(template.id)}
                    className="btn-ghost text-red-600 hover:bg-red-50 text-sm py-2"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
