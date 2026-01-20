"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type EmailStatus = "delivered" | "opened" | "clicked" | "bounced" | "complained";

interface EmailRecord {
  id: string;
  companyName: string | null;
  email: string | null;
  subject: string | null;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  clientId: string;
}

interface EmailTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  status: EmailStatus | null;
  count: number;
}

const statusConfig: Record<EmailStatus, { label: string; color: string; bgColor: string }> = {
  delivered: { label: "Delivered", color: "text-blue-600", bgColor: "bg-blue-50" },
  opened: { label: "Opened", color: "text-purple-600", bgColor: "bg-purple-50" },
  clicked: { label: "Clicked", color: "text-emerald-600", bgColor: "bg-emerald-50" },
  bounced: { label: "Bounced", color: "text-orange-600", bgColor: "bg-orange-50" },
  complained: { label: "Complained", color: "text-red-600", bgColor: "bg-red-50" },
};

export function EmailTrackingModal({
  isOpen,
  onClose,
  campaignId,
  status,
  count,
}: EmailTrackingModalProps) {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEmails = useCallback(async () => {
    if (!status) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/emails?status=${status}&page=${page}&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, status, page]);

  useEffect(() => {
    if (isOpen && status) {
      setPage(1);
      fetchEmails();
    }
  }, [isOpen, status]);

  useEffect(() => {
    if (isOpen && status) {
      fetchEmails();
    }
  }, [page, fetchEmails, isOpen, status]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelevantTime = (email: EmailRecord): string => {
    if (status === "clicked" && email.clickedAt) {
      return formatDate(email.clickedAt);
    }
    if (status === "opened" && email.openedAt) {
      return formatDate(email.openedAt);
    }
    return formatDate(email.sentAt);
  };

  const getTimeLabel = (): string => {
    if (status === "clicked") return "Clicked At";
    if (status === "opened") return "Opened At";
    return "Sent At";
  };

  if (!isOpen || !status) return null;

  const config = statusConfig[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full ${config.bgColor}`}>
              <span className={`font-semibold ${config.color}`}>{config.label}</span>
            </div>
            <span className="text-slate-500">
              {total} {total === 1 ? "email" : "emails"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-24" />
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.bgColor} flex items-center justify-center`}>
                <svg className={`w-8 h-8 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No {status} emails</p>
              <p className="text-slate-400 text-sm mt-1">Emails will appear here when they are {status}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {getTimeLabel()}
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {email.companyName || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{email.email || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-500 text-sm">{getRelevantTime(email)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/clients/${email.clientId}`}
                        className="text-sky-600 hover:text-sky-700 text-sm font-medium"
                        onClick={onClose}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
