"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { ClientFilters } from "@/components/ui/ClientFilters";
import type { Client } from "@/db/schema";

interface FiltersData {
  cities: { city: string; count: number }[];
  categories: { category: string; count: number }[];
  tags: string[];
  stats: {
    total: number;
    withEmail: number;
    active: number;
    inactive: number;
  };
}

interface PaginatedResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const columns: ColumnDef<Client, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="checkbox-field"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        className="checkbox-field"
      />
    ),
    size: 40,
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-900">{row.original.companyName || "-"}</div>
        {row.original.email && (
          <div className="text-xs text-slate-500 mt-0.5">{row.original.email}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ getValue }) => <span className="text-slate-600">{String(getValue() || "-")}</span>,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => {
      const category = getValue() as string;
      return category ? (
        <span className="badge-neutral">{category}</span>
      ) : (
        <span className="text-slate-400">-</span>
      );
    },
  },
  {
    accessorKey: "phonePrimary",
    header: "Phone",
    cell: ({ getValue }) => <span className="text-slate-600">{String(getValue() || "-")}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as string;
      const styles: Record<string, string> = {
        active: "badge-success",
        inactive: "badge-neutral",
        bounced: "badge-danger",
      };
      return (
        <span className={styles[status] || styles.active}>
          <span className={`status-dot ${status === "active" ? "status-dot-success" : status === "bounced" ? "status-dot-danger" : "bg-slate-400"}`}></span>
          {status || "active"}
        </span>
      );
    },
  },
];

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersData | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllProgress, setDeleteAllProgress] = useState({ deleted: 0, total: 0, isRunning: false });

  // Get params from URL
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const hasEmail = searchParams.get("hasEmail") || "";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      if (!("page" in updates)) {
        params.set("page", "1");
      }
      router.push(`/clients?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Fetch filters
  useEffect(() => {
    fetch("/api/clients/filters")
      .then((res) => res.json())
      .then(setFilters)
      .catch(console.error);
  }, []);

  // Fetch clients
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "200",
      sortBy,
      sortOrder,
      ...(search && { search }),
      ...(city && { city }),
      ...(category && { category }),
      ...(status && { status }),
      ...(hasEmail && { hasEmail }),
    });

    fetch(`/api/clients?${params}`)
      .then((res) => res.json())
      .then((data: PaginatedResponse) => {
        setClients(data.data);
        setPagination({
          page: data.pagination.page,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, search, city, category, status, hasEmail, sortBy, sortOrder]);

  // Debounced search
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateParams]);

  const selectedCount = Object.keys(rowSelection).length;

  const getSelectedIds = () => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key as keyof typeof rowSelection])
      .map((index) => clients[parseInt(index)]?.id)
      .filter(Boolean);
  };

  const handleDeleteAll = async () => {
    const total = filters?.stats?.total || 0;
    if (total === 0) return;

    setDeleteAllProgress({ deleted: 0, total, isRunning: true });

    let deletedCount = 0;

    while (deletedCount < total) {
      try {
        const res = await fetch("/api/clients?limit=200&page=1");
        const data = await res.json();

        if (!data.data || data.data.length === 0) break;

        const ids = data.data.map((c: Client) => c.id);

        const deleteRes = await fetch("/api/clients", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (deleteRes.ok) {
          const result = await deleteRes.json();
          deletedCount += result.deletedCount || ids.length;
          setDeleteAllProgress({ deleted: deletedCount, total, isRunning: true });
        } else {
          break;
        }
      } catch (error) {
        console.error("Delete batch error:", error);
        break;
      }
    }

    setDeleteAllProgress({ deleted: deletedCount, total, isRunning: false });
    setShowDeleteAllConfirm(false);

    router.refresh();
    const filtersRes = await fetch("/api/clients/filters");
    setFilters(await filtersRes.json());

    const params = new URLSearchParams({ page: "1", limit: "200" });
    const refreshRes = await fetch(`/api/clients?${params}`);
    const data = await refreshRes.json();
    setClients(data.data);
    setPagination({
      page: data.pagination.page,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
    });
  };

  const handleBulkDelete = async () => {
    const ids = getSelectedIds();
    if (ids.length === 0) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        setRowSelection({});
        setShowDeleteConfirm(false);
        router.refresh();
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "200",
          ...(search && { search }),
          ...(city && { city }),
          ...(category && { category }),
          ...(status && { status }),
          ...(hasEmail && { hasEmail }),
        });
        const refreshRes = await fetch(`/api/clients?${params}`);
        const data = await refreshRes.json();
        setClients(data.data);
        setPagination({
          page: data.pagination.page,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
        const filtersRes = await fetch("/api/clients/filters");
        const filtersData = await filtersRes.json();
        setFilters(filtersData);
      }
    } catch (error) {
      console.error("Failed to delete clients:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = search || city || category || status || hasEmail;

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients</h1>
          <p className="text-slate-500 mt-1">
            {filters?.stats?.total.toLocaleString() || 0} total clients
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            disabled={!filters?.stats?.total || deleteAllProgress.isRunning}
            className="btn-danger"
          >
            {deleteAllProgress.isRunning
              ? `Deleting... ${deleteAllProgress.deleted}/${deleteAllProgress.total}`
              : "Delete All"}
          </button>
          <Link href="/clients/import" className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Clients
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <ClientFilters
          filters={filters}
          activeFilters={{
            search,
            city,
            category,
            status,
            hasEmail,
            sortBy,
            sortOrder,
          }}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          onFilterChange={(key, value) => updateParams({ [key]: value })}
          onClearAll={() => router.push("/clients")}
        />
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="card bg-sky-50 border-sky-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sky-700 font-medium">
              {selectedCount} client{selectedCount > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm">
              Add to Campaign
            </button>
            <button className="btn-secondary text-sm">
              Export CSV
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger text-sm"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete All Clients</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete all {filters?.stats?.total.toLocaleString()} clients?
              This will permanently remove all client data.
            </p>
            {deleteAllProgress.isRunning && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium text-slate-900">{deleteAllProgress.deleted}/{deleteAllProgress.total}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-gradient-to-r from-red-500 to-red-400"
                    style={{ width: `${(deleteAllProgress.deleted / deleteAllProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={deleteAllProgress.isRunning}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteAllProgress.isRunning}
                className="btn-danger"
              >
                {deleteAllProgress.isRunning ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="modal-content p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Clients</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete {selectedCount} client{selectedCount > 1 ? "s" : ""}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="btn-danger"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <DataTable
          data={clients}
          columns={columns}
          isLoading={isLoading}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(client) => router.push(`/clients/${client.id}`)}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 200 + 1}-{Math.min(page * 200, pagination.total)}{" "}
            of {pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateParams({ page: String(page - 1) })}
              disabled={page <= 1}
              className="btn-secondary"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-600">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => updateParams({ page: String(page + 1) })}
              disabled={page >= pagination.totalPages}
              className="btn-secondary"
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientsPageLoading() {
  return (
    <div className="px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="skeleton-heading mb-2" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton-button" />
      </div>
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] skeleton h-10 rounded-xl" />
          <div className="skeleton h-10 w-32 rounded-xl" />
          <div className="skeleton h-10 w-32 rounded-xl" />
          <div className="skeleton h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="table-header p-4 flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-4 w-24" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-t border-slate-100 p-4 flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="skeleton h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsPageLoading />}>
      <ClientsPageContent />
    </Suspense>
  );
}
