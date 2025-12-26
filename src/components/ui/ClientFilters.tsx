"use client";

import { useState, useRef, useEffect } from "react";

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

interface ActiveFilters {
  search: string;
  city: string;
  category: string;
  status: string;
  hasEmail: string;
  sortBy: string;
  sortOrder: string;
}

interface ClientFiltersProps {
  filters: FiltersData | null;
  activeFilters: ActiveFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function ClientFilters({
  filters,
  activeFilters,
  searchInput,
  onSearchChange,
  onFilterChange,
  onClearAll,
}: ClientFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFiltersList = [
    activeFilters.city && { key: "city", label: activeFilters.city, value: activeFilters.city },
    activeFilters.category && { key: "category", label: activeFilters.category, value: activeFilters.category },
    activeFilters.status && { key: "status", label: activeFilters.status, value: activeFilters.status },
    activeFilters.hasEmail && {
      key: "hasEmail",
      label: activeFilters.hasEmail === "yes" ? "Has Email" : "No Email",
      value: activeFilters.hasEmail
    },
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  const activeCount = activeFiltersList.length + (activeFilters.search ? 1 : 0);

  const sortOptions = [
    { value: "created_at", label: "Created Date" },
    { value: "companyName", label: "Company Name" },
    { value: "city", label: "City" },
    { value: "category", label: "Category" },
  ];

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <svg
              className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, city..."
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Filters Popover */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className={`btn-secondary ${activeCount > 0 ? "border-sky-300 bg-sky-50" : ""}`}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-sky-500 text-white rounded-full">
                {activeCount}
              </span>
            )}
            <svg
              className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
          </button>

          {/* Popover Content */}
          {isOpen && (
            <div
              ref={popoverRef}
              className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 z-50 animate-modal-in"
            >
              <div className="p-4 space-y-4">
                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    City
                  </label>
                  <select
                    value={activeFilters.city}
                    onChange={(e) => onFilterChange("city", e.target.value)}
                    className="select-field w-full"
                  >
                    <option value="">All Cities</option>
                    {filters?.cities.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    value={activeFilters.category}
                    onChange={(e) => onFilterChange("category", e.target.value)}
                    className="select-field w-full"
                  >
                    <option value="">All Categories</option>
                    {filters?.categories.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={activeFilters.status}
                    onChange={(e) => onFilterChange("status", e.target.value)}
                    className="select-field w-full"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="bounced">Bounced</option>
                  </select>
                </div>

                {/* Has Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <select
                    value={activeFilters.hasEmail}
                    onChange={(e) => onFilterChange("hasEmail", e.target.value)}
                    className="select-field w-full"
                  >
                    <option value="">All</option>
                    <option value="yes">Has Email</option>
                    <option value="no">No Email</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              {activeCount > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                  <button
                    onClick={() => {
                      onClearAll();
                      setIsOpen(false);
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={activeFilters.sortBy}
            onChange={(e) => onFilterChange("sortBy", e.target.value)}
            className="select-field text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              onFilterChange("sortOrder", activeFilters.sortOrder === "asc" ? "desc" : "asc")
            }
            className="btn-secondary px-3"
            title={activeFilters.sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {activeFilters.sortOrder === "asc" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeFiltersList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Active:
          </span>
          {activeFiltersList.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 text-sm font-medium rounded-lg ring-1 ring-inset ring-sky-600/20"
            >
              {filter.label}
              <button
                onClick={() => onFilterChange(filter.key, "")}
                className="ml-1 hover:text-sky-900"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={onClearAll}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
