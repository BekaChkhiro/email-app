"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ClientHistory } from "@/components/clients/ClientHistory";
import { ClientNotes } from "@/components/clients/ClientNotes";
import type { Client } from "@/db/schema";

export default function ClientDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "notes">("history");

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setClient(data);
        setEditData(data);
      })
      .catch(() => router.push("/clients"))
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleSave = async () => {
    if (!client || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        const updated = await res.json();
        setClient(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!client) return;
    const currentTags = client.tags || [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      setEditData({ ...editData, tags: newTags });
      fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      })
        .then((res) => res.json())
        .then(setClient)
        .catch(console.error);
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (!client) return;
    const newTags = (client.tags || []).filter((t) => t !== tag);
    fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    })
      .then((res) => res.json())
      .then(setClient)
      .catch(console.error);
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div>
            <div className="skeleton h-7 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="skeleton h-6 w-40 mb-6" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <div className="skeleton h-4 w-20 mb-2" />
                    <div className="skeleton h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="skeleton h-6 w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="px-4 sm:px-6 py-8">
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-900 font-medium mb-2">Client not found</p>
          <p className="text-slate-500 mb-6">The client you&apos;re looking for doesn&apos;t exist</p>
          <Link href="/clients" className="btn-primary">
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const predefinedTags = ["B2B", "B2C", "VIP", "Partner", "Lead", "Customer"];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "badge-success";
      case "bounced":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {client.companyName || "Unnamed Client"}
              </h1>
              <span className={getStatusStyle(client.status || "active")}>
                <span className={`status-dot ${client.status === "active" ? "status-dot-success" : client.status === "bounced" ? "status-dot-danger" : "bg-slate-400"}`}></span>
                {client.status || "active"}
              </span>
            </div>
            {client.email && (
              <p className="text-slate-500 mt-1">{client.email}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(client);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Details Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Client Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="Company Name"
                value={editData.companyName}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, companyName: v })}
              />
              <Field
                label="Email"
                value={editData.email}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, email: v })}
              />
              <Field
                label="Phone"
                value={editData.phonePrimary}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, phonePrimary: v })}
              />
              <Field
                label="Phone 2"
                value={editData.phoneSecondary}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, phoneSecondary: v })}
              />
              <Field
                label="City"
                value={editData.city}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, city: v })}
              />
              <Field
                label="Category"
                value={editData.category}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, category: v })}
              />
              <Field
                label="Address"
                value={editData.address}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, address: v })}
                fullWidth
              />
              <Field
                label="Website"
                value={editData.website}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, website: v })}
              />
              <Field
                label="Facebook"
                value={editData.facebook}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, facebook: v })}
              />
              <Field
                label="ID Code"
                value={editData.identificationCode}
                isEditing={isEditing}
                onChange={(v) => setEditData({ ...editData, identificationCode: v })}
              />
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Status</label>
                {isEditing ? (
                  <select
                    value={editData.status || "active"}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="select-field w-full"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="bounced">Bounced</option>
                  </select>
                ) : (
                  <span className={getStatusStyle(client.status || "active")}>
                    <span className={`status-dot ${client.status === "active" ? "status-dot-success" : client.status === "bounced" ? "status-dot-danger" : "bg-slate-400"}`}></span>
                    {client.status || "active"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container-purple">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Tags</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {(client.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="badge-info group"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-sky-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {(client.tags || []).length === 0 && (
                <span className="text-slate-400 text-sm">No tags added yet</span>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-3">Add tags:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedTags
                  .filter((t) => !(client.tags || []).includes(t))
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="px-3 py-1.5 border-2 border-dashed border-slate-200 rounded-full text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* History & Notes Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === "history"
                    ? "text-sky-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email History
                </span>
                {activeTab === "history" && (
                  <span className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === "notes"
                    ? "text-sky-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                </span>
                {activeTab === "notes" && (
                  <span className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full" />
                )}
              </button>
            </div>
            <div className="p-6">
              {activeTab === "history" ? (
                <ClientHistory clientId={id} />
              ) : (
                <ClientNotes clientId={id} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-container-success">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">Quick Info</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Created</span>
                <span className="text-sm font-medium text-slate-900">
                  {client.createdAt
                    ? new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Updated</span>
                <span className="text-sm font-medium text-slate-900">
                  {client.updatedAt
                    ? new Date(client.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Has Email</span>
                <span className={`badge ${client.email ? "badge-success" : "badge-neutral"}`}>
                  {client.email ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="icon-container-amber">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">Actions</h3>
            </div>
            <div className="space-y-2">
              <button className="w-full btn-secondary justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </button>
              <button className="w-full btn-secondary justify-start">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to Campaign
              </button>
              <button className="w-full btn-ghost justify-start text-red-600 hover:bg-red-50 hover:text-red-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Client
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  isEditing,
  onChange,
  fullWidth,
}: {
  label: string;
  value: string | null | undefined;
  isEditing: boolean;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-slate-500 mb-1.5">{label}</label>
      {isEditing ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="input-field"
        />
      ) : (
        <p className="text-slate-900 font-medium">{value || <span className="text-slate-400 font-normal">-</span>}</p>
      )}
    </div>
  );
}
