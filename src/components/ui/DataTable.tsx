"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
  OnChangeFn,
} from "@tanstack/react-table";
import { useState } from "react";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  rowSelection = {},
  onRowSelectionChange,
  onRowClick,
}: DataTableProps<T>) {
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({});

  const selection = onRowSelectionChange ? rowSelection : internalSelection;
  const setSelection = onRowSelectionChange || setInternalSelection;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setSelection,
    state: {
      rowSelection: selection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {columns.map((_, idx) => (
                <th key={idx} className="table-header-cell">
                  <div className="skeleton h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIdx) => (
              <tr key={rowIdx} className="table-row">
                {columns.map((_, colIdx) => (
                  <td key={colIdx} className="table-cell">
                    <div className="skeleton h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-state py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No data found</p>
        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead className="table-header">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="table-header-cell"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`transition-colors duration-150 ${
                onRowClick ? "cursor-pointer" : ""
              } ${
                row.getIsSelected()
                  ? "table-row-selected"
                  : "hover:bg-slate-50/50"
              }`}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="table-cell">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
