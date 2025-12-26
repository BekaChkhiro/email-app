"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  templateName: string | null;
  status: string;
  dailyLimit: number;
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return { badge: "badge-success", dot: "status-dot-success" };
      case "paused":
        return { badge: "badge-warning", dot: "status-dot-warning" };
      case "completed":
        return { badge: "badge-info", dot: "status-dot-info" };
      case "draft":
        return { badge: "badge-neutral", dot: "bg-slate-400" };
      case "scheduled":
        return { badge: "badge-purple", dot: "bg-purple-500" };
      default:
        return { badge: "badge-neutral", dot: "bg-slate-400" };
    }
  };

  const formatDate = (dateStr: string | null) => {
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="skeleton h-6 w-48" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
              <div className="skeleton h-4 w-32 mb-4" />
              <div className="skeleton h-2 w-full rounded-full" />
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
          <p className="text-slate-500 mt-1">{campaigns.length} campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </Link>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Create your first email campaign to start reaching your clients
            </p>
            <Link href="/campaigns/new" className="btn-primary">
              Create your first campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const statusStyle = getStatusStyle(campaign.status || "draft");
            const progress = campaign.totalRecipients > 0
              ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
              : 0;

            return (
              <div
                key={campaign.id}
                className="card-hover p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Main Info */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                      <span className={statusStyle.badge}>
                        <span className={`status-dot ${statusStyle.dot}`}></span>
                        {campaign.status || "draft"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      Template: {campaign.templateName || "None selected"}
                    </p>

                    {/* Progress */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 max-w-md">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">
                            {campaign.sentCount.toLocaleString()} / {campaign.totalRecipients.toLocaleString()} sent
                          </span>
                          <span className="font-medium text-slate-900">{progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {campaign.dailyLimit}/day
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      className="btn-secondary text-sm"
                    >
                      View Details
                    </button>
                    {deleteConfirm === campaign.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="btn-danger text-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(campaign.id)}
                        className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Created: {formatDate(campaign.createdAt)}
                  </span>
                  {campaign.startedAt && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Started: {formatDate(campaign.startedAt)}
                    </span>
                  )}
                  {campaign.completedAt && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Completed: {formatDate(campaign.completedAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
