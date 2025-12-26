"use client";

import { useState, useEffect } from "react";

interface EmailHistoryItem {
  id: string;
  subject: string | null;
  contentPreview: string | null;
  status: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  campaignName: string | null;
  templateName: string | null;
}

interface ClientHistoryProps {
  clientId: string;
}

export function ClientHistory({ clientId }: ClientHistoryProps) {
  const [history, setHistory] = useState<EmailHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/history`)
      .then((res) => res.json())
      .then(setHistory)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [clientId]);

  const getStatusBadge = (item: EmailHistoryItem) => {
    if (item.clickedAt) {
      return <span className="badge-purple">Clicked</span>;
    }
    if (item.openedAt) {
      return <span className="badge-info">Opened</span>;
    }
    if (item.status === "bounced") {
      return <span className="badge-danger">Bounced</span>;
    }
    if (item.status === "delivered") {
      return <span className="badge-success">Delivered</span>;
    }
    return <span className="badge-neutral">Sent</span>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-4 w-24" />
            </div>
            <div className="skeleton h-5 w-2/3 mb-2" />
            <div className="skeleton h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="empty-state py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
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
        <p className="text-slate-600 font-medium">No emails sent yet</p>
        <p className="text-slate-400 text-sm mt-1">Emails sent to this client will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all duration-200"
        >
          <div
            className="p-4 cursor-pointer"
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(item)}
                  {item.campaignName && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {item.campaignName}
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-slate-900">
                  {item.subject || "No subject"}
                </h4>
                <p className="text-sm text-slate-500 mt-1">{formatDate(item.sentAt)}</p>
              </div>
              <div className="ml-4 p-1">
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                    expandedId === item.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-slate-500">Sent:</span>
                  <span className="text-slate-700">{formatDate(item.sentAt)}</span>
                </div>
                {item.openedAt && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-slate-500">Opened:</span>
                    <span className="text-slate-700">{formatDate(item.openedAt)}</span>
                  </div>
                )}
                {item.clickedAt && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-slate-500">Clicked:</span>
                    <span className="text-slate-700">{formatDate(item.clickedAt)}</span>
                  </div>
                )}
                {item.templateName && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-500">Template:</span>
                    <span className="text-slate-700">{item.templateName}</span>
                  </div>
                )}
              </div>
              {item.contentPreview && (
                <div className="p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 leading-relaxed">
                  {item.contentPreview}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
