"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalClients: number;
  activeCampaigns: number;
  totalTemplates: number;
  emailsSent: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeCampaigns: 0,
    totalTemplates: 0,
    emailsSent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients/filters").then((r) => r.json()),
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ])
      .then(([filtersData, campaigns, templates]) => {
        setStats({
          totalClients: filtersData?.stats?.total || 0,
          activeCampaigns: campaigns?.filter((c: { status: string }) => c.status === "active").length || 0,
          totalTemplates: templates?.length || 0,
          emailsSent: campaigns?.reduce((acc: number, c: { sentCount: number }) => acc + (c.sentCount || 0), 0) || 0,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your campaigns.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-container-primary">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="skeleton h-8 w-20 mb-1"></div>
          ) : (
            <div className="stat-value">{stats.totalClients.toLocaleString()}</div>
          )}
          <div className="stat-label">Total Clients</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-container-success">
              <svg
                className="w-5 h-5"
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
          </div>
          {isLoading ? (
            <div className="skeleton h-8 w-16 mb-1"></div>
          ) : (
            <div className="stat-value">{stats.activeCampaigns}</div>
          )}
          <div className="stat-label">Active Campaigns</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-container-purple">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
          </div>
          {isLoading ? (
            <div className="skeleton h-8 w-12 mb-1"></div>
          ) : (
            <div className="stat-value">{stats.totalTemplates}</div>
          )}
          <div className="stat-label">Templates</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-container-amber">
              <svg
                className="w-5 h-5"
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
            </div>
          </div>
          {isLoading ? (
            <div className="skeleton h-8 w-20 mb-1"></div>
          ) : (
            <div className="stat-value">{stats.emailsSent.toLocaleString()}</div>
          )}
          <div className="stat-label">Emails Sent</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Import Card */}
        <Link href="/clients/import" className="card-interactive p-6 group">
          <div className="icon-container-primary mb-4 group-hover:scale-110 transition-transform duration-200">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
            Import Clients
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Upload Excel or CSV files to import client data into your database
          </p>
          <div className="mt-4 flex items-center text-sky-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
            Start Import
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>

        {/* Clients Card */}
        <Link href="/clients" className="card-interactive p-6 group">
          <div className="icon-container-success mb-4 group-hover:scale-110 transition-transform duration-200">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
            Manage Clients
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            View, search, and manage your client database with powerful filters
          </p>
          <div className="mt-4 flex items-center text-emerald-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
            View Clients
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>

        {/* Campaigns Card */}
        <Link href="/campaigns" className="card-interactive p-6 group">
          <div className="icon-container-purple mb-4 group-hover:scale-110 transition-transform duration-200">
            <svg
              className="w-6 h-6"
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
          <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
            Email Campaigns
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Create, manage, and track your email marketing campaigns
          </p>
          <div className="mt-4 flex items-center text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
            View Campaigns
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
      </div>

      {/* Templates Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
          <Link
            href="/templates"
            className="text-sm text-sky-600 font-medium hover:text-sky-700 flex items-center gap-1"
          >
            View All
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <Link href="/templates/new" className="card-interactive p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <svg
              className="w-7 h-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Create New Template</h3>
            <p className="text-sm text-slate-500">
              Design a new email template for your campaigns
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
