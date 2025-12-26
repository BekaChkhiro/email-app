"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface CampaignDetail {
  id: string;
  name: string;
  templateId: string | null;
  templateName: string | null;
  templateSubject: string | null;
  status: string;
  dailyLimit: number;
  sendStartHour: number;
  sendEndHour: number;
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  recipientStats: Record<string, number>;
  sampleRecipients: Array<{
    id: string;
    companyName: string | null;
    email: string | null;
    status: string;
    sentAt: string | null;
  }>;
}

interface RecentActivity {
  id: string;
  clientId: string;
  companyName: string | null;
  email: string | null;
  subject: string | null;
  status: string;
  sentAt: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [todaySentCount, setTodaySentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipients" | "activity">("recipients");

  // Fetch campaign data
  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setCampaign(data);
    } catch {
      router.push("/campaigns");
    }
  }, [id, router]);

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}/activity`);
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.activity || []);
        setTodaySentCount(data.todaySentCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    Promise.all([fetchCampaign(), fetchActivity()]).finally(() =>
      setIsLoading(false)
    );
  }, [fetchCampaign, fetchActivity]);

  // Polling for real-time updates (every 30 seconds when campaign is active)
  useEffect(() => {
    if (campaign?.status !== "active") return;

    const interval = setInterval(() => {
      fetchCampaign();
      fetchActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign, fetchActivity]);

  const handleAction = async (action: "launch" | "pause" | "resume" | "stop") => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCampaign((prev) =>
          prev ? { ...prev, ...data.campaign } : null
        );
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "badge-success";
      case "paused":
        return "badge-warning";
      case "completed":
        return "badge-info";
      case "stopped":
        return "badge-danger";
      case "draft":
        return "badge-neutral";
      case "sent":
        return "badge-success";
      case "failed":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate estimated next send
  const getNextSendEstimate = () => {
    if (!campaign || campaign.status !== "active") return null;
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < campaign.sendStartHour) {
      const next = new Date();
      next.setHours(campaign.sendStartHour, 0, 0, 0);
      return next;
    }

    if (currentHour >= campaign.sendEndHour) {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      next.setHours(campaign.sendStartHour, 0, 0, 0);
      return next;
    }

    // Within sending hours - next batch in 5-15 minutes
    const next = new Date();
    next.setMinutes(next.getMinutes() + 5);
    return next;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div>
              <div className="skeleton h-7 w-64 mb-2" />
              <div className="skeleton h-4 w-40" />
            </div>
          </div>
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <div className="empty-state py-16">
          <div className="icon-container icon-container-lg mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium mb-2">Campaign not found</p>
          <Link href="/campaigns" className="text-sky-600 hover:text-sky-700 font-medium">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const progress =
    campaign.totalRecipients > 0
      ? (campaign.sentCount / campaign.totalRecipients) * 100
      : 0;

  const nextSend = getNextSendEstimate();
  const dailyProgress = campaign.dailyLimit > 0
    ? (todaySentCount / campaign.dailyLimit) * 100
    : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={getStatusBadge(campaign.status || "draft")}>
                {campaign.status || "draft"}
              </span>
              {campaign.status === "active" && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live
                </span>
              )}
              <span className="text-slate-400 text-sm">
                Created {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button
              onClick={() => handleAction("launch")}
              disabled={isUpdating}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launch
            </button>
          )}
          {campaign.status === "active" && (
            <>
              <button
                onClick={() => handleAction("pause")}
                disabled={isUpdating}
                className="btn-warning"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={isUpdating}
                className="btn-danger"
              >
                Stop
              </button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <button
                onClick={() => handleAction("resume")}
                disabled={isUpdating}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={isUpdating}
                className="btn-danger"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Progress</h2>

            {/* Overall Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">
                  {campaign.sentCount} of {campaign.totalRecipients} emails sent
                </span>
                <span className="font-semibold text-slate-900">{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Today's Progress */}
            {campaign.status === "active" && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Today&apos;s Progress</span>
                  <span className="font-semibold text-slate-900">
                    {todaySentCount} / {campaign.dailyLimit} daily limit
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                  />
                </div>
                {nextSend && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Next batch: ~{formatTime(nextSend.toISOString())}
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-400">
                  {campaign.recipientStats?.pending || 0}
                </p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {campaign.recipientStats?.sent || 0}
                </p>
                <p className="text-sm text-slate-500">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">
                  {campaign.recipientStats?.failed || 0}
                </p>
                <p className="text-sm text-slate-500">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">
                  {campaign.recipientStats?.skipped || 0}
                </p>
                <p className="text-sm text-slate-500">Skipped</p>
              </div>
            </div>
          </div>

          {/* Tabs: Recipients / Activity */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("recipients")}
                className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors relative ${
                  activeTab === "recipients"
                    ? "text-sky-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Recipients
                {activeTab === "recipients" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors relative ${
                  activeTab === "activity"
                    ? "text-sky-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Recent Activity
                {activeTab === "activity" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600" />
                )}
              </button>
            </div>

            {activeTab === "recipients" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Company</th>
                      <th className="table-header-cell">Email</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaign.sampleRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          No recipients
                        </td>
                      </tr>
                    ) : (
                      campaign.sampleRecipients.map((recipient) => (
                        <tr key={recipient.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="table-cell font-medium text-slate-900">
                            {recipient.companyName || "-"}
                          </td>
                          <td className="table-cell text-slate-600">
                            {recipient.email || "-"}
                          </td>
                          <td className="table-cell">
                            <span className={getStatusBadge(recipient.status || "pending")}>
                              {recipient.status || "pending"}
                            </span>
                          </td>
                          <td className="table-cell text-slate-500">
                            {formatDate(recipient.sentAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="empty-state py-12">
                    <div className="icon-container mx-auto mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500">No activity yet</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {activity.companyName || activity.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">
                          {activity.subject}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={getStatusBadge(activity.status)}>
                          {activity.status}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTime(activity.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Campaign Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Template</span>
                <span className="font-medium text-slate-900">
                  {campaign.templateName || "None"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Daily Limit</span>
                <span className="text-slate-700">{campaign.dailyLimit} emails/day</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Send Window</span>
                <span className="text-slate-700">
                  {campaign.sendStartHour.toString().padStart(2, "0")}:00 -{" "}
                  {campaign.sendEndHour.toString().padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Recipients</span>
                <span className="text-slate-700">{campaign.totalRecipients}</span>
              </div>
              {campaign.startedAt && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Started</span>
                  <span className="text-slate-700">{formatDate(campaign.startedAt)}</span>
                </div>
              )}
              {campaign.completedAt && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">
                    {campaign.status === "stopped" ? "Stopped" : "Completed"}
                  </span>
                  <span className="text-slate-700">{formatDate(campaign.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Estimated Completion */}
          {campaign.status === "active" && campaign.totalRecipients > campaign.sentCount && (
            <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-semibold text-sky-900">Estimated Completion</h3>
              </div>
              <p className="text-2xl font-bold text-sky-700">
                {Math.ceil(
                  (campaign.totalRecipients - campaign.sentCount) / campaign.dailyLimit
                )}{" "}
                <span className="text-base font-normal">days remaining</span>
              </p>
            </div>
          )}

          {/* Template Preview */}
          {campaign.templateId && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Template Preview</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 mb-3">
                  <span className="text-slate-400">Subject:</span> {campaign.templateSubject}
                </p>
                <Link
                  href={`/templates/${campaign.templateId}`}
                  className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
                >
                  View Template
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
