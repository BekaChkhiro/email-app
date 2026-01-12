"use client";

import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Mail,
  LucideIcon,
} from "lucide-react";

interface Folder {
  name: string;
  path: string;
  icon: string;
  total: number;
  unread: number;
}

interface FolderSidebarProps {
  folders: Folder[];
  activeFolder: string;
  onFolderSelect: (path: string) => void;
  onCompose: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  inbox: Inbox,
  send: Send,
  "file-text": FileText,
  trash: Trash2,
};

export function FolderSidebar({
  folders,
  activeFolder,
  onFolderSelect,
  onCompose,
}: FolderSidebarProps) {
  return (
    <div className="flex flex-col h-full p-4">
      {/* Compose Button */}
      <button
        onClick={onCompose}
        className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
      >
        <Mail className="w-4 h-4" />
        Compose
      </button>

      {/* Folders */}
      <nav className="space-y-1">
        {folders.map((folder) => {
          const Icon = iconMap[folder.icon] || Inbox;
          const isActive = folder.path === activeFolder;

          return (
            <button
              key={folder.path}
              onClick={() => onFolderSelect(folder.path)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                {folder.name}
              </span>
              {folder.unread > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    isActive
                      ? "bg-sky-200 text-sky-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {folder.unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Email Address */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 truncate">
          {process.env.NEXT_PUBLIC_EMAIL_USER || "Email Client"}
        </div>
      </div>
    </div>
  );
}
