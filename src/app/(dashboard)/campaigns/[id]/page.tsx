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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "stopped":
        return "bg-red-100 text-red-700";
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "sent":
        return "bg-green-100 text-green-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center">
        <p>Campaign not found</p>
        <Link href="/campaigns" className="text-blue-600 hover:underline">
          Back to Campaigns
        </Link>
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
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                  campaign.status || "draft"
                )}`}
              >
                {campaign.status || "draft"}
              </span>
              {campaign.status === "active" && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              <span className="text-gray-500 text-sm">
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Launch
            </button>
          )}
          {campaign.status === "active" && (
            <>
              <button
                onClick={() => handleAction("pause")}
                disabled={isUpdating}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                Pause
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Resume
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Progress</h2>

            {/* Overall Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {campaign.sentCount} of {campaign.totalRecipients} emails sent
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Today's Progress */}
            {campaign.status === "active" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Today&apos;s Progress</span>
                  <span className="font-medium">
                    {todaySentCount} / {campaign.dailyLimit} daily limit
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                  />
                </div>
                {nextSend && (
                  <p className="text-xs text-gray-500 mt-2">
                    Next batch: ~{formatTime(nextSend.toISOString())}
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {campaign.recipientStats?.pending || 0}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {campaign.recipientStats?.sent || 0}
                </p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {campaign.recipientStats?.failed || 0}
                </p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">
                  {campaign.recipientStats?.skipped || 0}
                </p>
                <p className="text-sm text-gray-500">Skipped</p>
              </div>
            </div>
          </div>

          {/* Tabs: Recipients / Activity */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("recipients")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === "recipients"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Recipients
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === "activity"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Recent Activity
              </button>
            </div>

            {activeTab === "recipients" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium text-gray-600">
                        Company
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600">
                        Email
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600">
                        Status
                      </th>
                      <th className="p-3 text-left text-sm font-medium text-gray-600">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.sampleRecipients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">
                          No recipients
                        </td>
                      </tr>
                    ) : (
                      campaign.sampleRecipients.map((recipient) => (
                        <tr key={recipient.id} className="border-t">
                          <td className="p-3 text-sm">
                            {recipient.companyName || "-"}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {recipient.email || "-"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                                recipient.status || "pending"
                              )}`}
                            >
                              {recipient.status || "pending"}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-500">
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
                  <div className="text-center py-8 text-gray-500">
                    No activity yet
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {activity.companyName || activity.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[300px]">
                          {activity.subject}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
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
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Campaign Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Template</span>
                <span className="font-medium">
                  {campaign.templateName || "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Limit</span>
                <span>{campaign.dailyLimit} emails/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Send Window</span>
                <span>
                  {campaign.sendStartHour.toString().padStart(2, "0")}:00 -{" "}
                  {campaign.sendEndHour.toString().padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Recipients</span>
                <span>{campaign.totalRecipients}</span>
              </div>
              {campaign.startedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Started</span>
                  <span>{formatDate(campaign.startedAt)}</span>
                </div>
              )}
              {campaign.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {campaign.status === "stopped" ? "Stopped" : "Completed"}
                  </span>
                  <span>{formatDate(campaign.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Estimated Completion */}
          {campaign.status === "active" && campaign.totalRecipients > campaign.sentCount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Estimated Completion</h3>
              <p className="text-sm text-blue-700">
                {Math.ceil(
                  (campaign.totalRecipients - campaign.sentCount) / campaign.dailyLimit
                )}{" "}
                days remaining
              </p>
            </div>
          )}

          {/* Template Preview */}
          {campaign.templateId && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Template Preview</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Subject: {campaign.templateSubject}
                </p>
                <Link
                  href={`/templates/${campaign.templateId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Template
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
