"use client";

import { ReactNode } from "react";

interface MailLayoutProps {
  sidebar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
}

export function MailLayout({ sidebar, list, detail }: MailLayoutProps) {
  return (
    <div className="flex h-full bg-slate-100">
      {/* Sidebar - Fixed width */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 hidden md:block">
        {sidebar}
      </div>

      {/* Email List - Flexible width */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex-shrink-0 overflow-hidden">
        {list}
      </div>

      {/* Email Detail - Takes remaining space */}
      <div className="flex-1 bg-white overflow-hidden hidden md:block">
        {detail}
      </div>
    </div>
  );
}
