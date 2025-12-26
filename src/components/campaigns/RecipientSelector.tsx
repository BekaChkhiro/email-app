"use client";

import { useState, useEffect } from "react";
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
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/clients?limit=10000")
      .then((res) => res.json())
      .then((data) => {
        const clientList = data.clients || [];
        // Only clients with email
        const withEmail = clientList.filter((c: Client) => c.email);
        setClients(withEmail);
        setFilteredClients(withEmail);

        // Extract unique categories and cities
        const cats = Array.from(new Set(withEmail.map((c: Client) => c.category).filter(Boolean))) as string[];
        const cts = Array.from(new Set(withEmail.map((c: Client) => c.city).filter(Boolean))) as string[];
        setCategories(cats.sort());
        setCities(cts.sort());
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let result = clients;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.companyName?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter) {
      result = result.filter((c) => c.category === categoryFilter);
    }

    if (cityFilter) {
      result = result.filter((c) => c.city === cityFilter);
    }

    setFilteredClients(result);
  }, [search, categoryFilter, cityFilter, clients]);

  const handleSelectAll = () => {
    const allIds = filteredClients.map((c) => c.id);
    const newSelection = Array.from(new Set([...selectedIds, ...allIds]));
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredClients.map((c) => c.id));
    const newSelection = selectedIds.filter((id) => !filteredIds.has(id));
    onSelectionChange(newSelection);
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const allFilteredSelected = filteredClients.length > 0 &&
    filteredClients.every((c) => selectedIds.includes(c.id));

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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            onClick={allFilteredSelected ? handleDeselectAll : handleSelectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {allFilteredSelected ? "Deselect All Visible" : "Select All Visible"}
          </button>
          <span className="text-sm text-gray-500">
            Showing {filteredClients.length} of {clients.length} clients
          </span>
        </div>
        <div className="text-sm font-medium">
          {selectedIds.length} selected
        </div>
      </div>

      {/* Client List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {filteredClients.length === 0 ? (
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
                    checked={allFilteredSelected}
                    onChange={allFilteredSelected ? handleDeselectAll : handleSelectAll}
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
              {filteredClients.map((client) => (
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
    </div>
  );
}
