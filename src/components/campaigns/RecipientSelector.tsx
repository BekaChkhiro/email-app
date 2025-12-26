"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client } from "@/db/schema";

interface RecipientSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function RecipientSelector({
  selectedIds,
  onSelectionChange,
}: RecipientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 100;

  // Fetch categories and cities for filters
  useEffect(() => {
    fetch("/api/clients/filters")
      .then((res) => res.json())
      .then((data) => {
        // API returns {category, count} and {city, count} objects
        setCategories((data.categories || []).map((c: { category: string }) => c.category).filter(Boolean));
        setCities((data.cities || []).map((c: { city: string }) => c.city).filter(Boolean));
      })
      .catch(console.error);
  }, []);

  // Build query URL
  const buildUrl = useCallback((pageNum: number) => {
    const params = new URLSearchParams({
      page: pageNum.toString(),
      limit: limit.toString(),
      hasEmail: "yes",
    });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    if (cityFilter) params.set("city", cityFilter);
    return `/api/clients?${params.toString()}`;
  }, [search, categoryFilter, cityFilter]);

  // Fetch clients
  const fetchClients = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch(buildUrl(pageNum));
      const data = await res.json();
      const clientList = data.data || [];

      if (append) {
        setClients(prev => [...prev, ...clientList]);
      } else {
        setClients(clientList);
      }

      setTotal(data.pagination?.total || 0);
      setHasMore(data.pagination?.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [buildUrl]);

  // Initial load and filter changes
  useEffect(() => {
    setPage(1);
    fetchClients(1, false);
  }, [search, categoryFilter, cityFilter, fetchClients]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchClients(page + 1, true);
    }
  };

  const handleSelectAll = () => {
    const allIds = clients.map((c) => c.id);
    const newSelection = Array.from(new Set([...selectedIds, ...allIds]));
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const clientIds = new Set(clients.map((c) => c.id));
    const newSelection = selectedIds.filter((id) => !clientIds.has(id));
    onSelectionChange(newSelection);
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const allVisibleSelected = clients.length > 0 &&
    clients.every((c) => selectedIds.includes(c.id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Selection Actions */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={allVisibleSelected ? handleDeselectAll : handleSelectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {allVisibleSelected ? "Deselect Visible" : "Select Visible"}
          </button>
          <span className="text-sm text-gray-500">
            Showing {clients.length} of {total} clients
          </span>
        </div>
        <div className="text-sm font-medium">
          {selectedIds.length} selected
        </div>
      </div>

      {/* Client List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {clients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No clients found with email addresses
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={allVisibleSelected ? handleDeselectAll : handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  City
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => handleToggle(client.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedIds.includes(client.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(client.id)}
                      onChange={() => handleToggle(client.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {client.companyName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.category || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {client.city || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : `Load More (${clients.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
