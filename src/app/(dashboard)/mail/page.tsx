"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MailLayout,
  FolderSidebar,
  EmailList,
  EmailView,
  ComposeModal,
  SearchBar,
} from "@/components/mail";
import { RefreshCw } from "lucide-react";

// Auto-refresh interval in milliseconds (10 seconds)
const AUTO_REFRESH_INTERVAL = 10000;

interface Folder {
  name: string;
  path: string;
  icon: string;
  total: number;
  unread: number;
}

interface EmailMessage {
  id: string;
  uid: number;
  messageId: string;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  date: Date;
  preview: string;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
}

interface EmailFull extends EmailMessage {
  html?: string;
  text?: string;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
  }[];
}

export default function MailPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailFull | null>(null);
  const [thread, setThread] = useState<EmailFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailFull | null>(null);
  const [forwardEmail, setForwardEmail] = useState<EmailFull | null>(null);
  const [replyAll, setReplyAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Ref to track if polling is in progress
  const isPollingRef = useRef(false);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/mail/folders");
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        folder: activeFolder,
        page: page.toString(),
        limit: "50",
      });

      const res = await fetch(`/api/mail/messages?${params}`);
      const data = await res.json();

      if (data.messages) {
        setMessages(data.messages);
        setPagination({
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFolder, page]);

  // Refresh all
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFolders(), fetchMessages()]);
    setIsRefreshing(false);
  };

  // Fetch single email (without thread for speed)
  const fetchEmail = async (uid: number) => {
    setIsLoadingEmail(true);
    setThread([]);
    try {
      const res = await fetch(
        `/api/mail/messages/${uid}?folder=${encodeURIComponent(activeFolder)}`
      );
      const data = await res.json();
      if (data.message) {
        setSelectedEmail(data.message);

        // Update message in list as read
        setMessages((prev) =>
          prev.map((m) => (m.uid === uid ? { ...m, isRead: true } : m))
        );

        // Update unread count
        setFolders((prev) =>
          prev.map((f) =>
            f.path === activeFolder && f.unread > 0
              ? { ...f, unread: f.unread - 1 }
              : f
          )
        );
      }
    } catch (error) {
      console.error("Failed to fetch email:", error);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  // Fetch thread separately (manual load for performance)
  const fetchThread = async (uid: number) => {
    try {
      const threadRes = await fetch(
        `/api/mail/messages/${uid}/thread?folder=${encodeURIComponent(activeFolder)}`
      );
      const threadData = await threadRes.json();
      if (threadData.thread && threadData.thread.length > 1) {
        setThread(threadData.thread);
      }
    } catch (threadError) {
      console.error("Failed to fetch thread:", threadError);
    }
  };

  // Search emails
  const handleSearch = async (query: string) => {
    if (!query) {
      fetchMessages();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/mail/search?q=${encodeURIComponent(query)}&folder=${encodeURIComponent(activeFolder)}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setPagination({ total: data.messages.length, totalPages: 1 });
      }
    } catch (error) {
      console.error("Failed to search:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Move to trash
  const handleMoveToTrash = async (uid: number) => {
    try {
      await fetch(`/api/mail/messages/${uid}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: activeFolder, targetFolder: "Trash" }),
      });
      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      if (selectedEmail?.uid === uid) {
        setSelectedEmail(null);
      }
      fetchFolders();
    } catch (error) {
      console.error("Failed to move:", error);
    }
  };

  // Toggle star
  const handleToggleStar = async (uid: number) => {
    const message = messages.find((m) => m.uid === uid);
    if (!message) return;

    try {
      await fetch(`/api/mail/messages/${uid}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: activeFolder,
          starred: !message.isStarred,
        }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, isStarred: !m.isStarred } : m))
      );
      if (selectedEmail?.uid === uid) {
        setSelectedEmail((prev) =>
          prev ? { ...prev, isStarred: !prev.isStarred } : null
        );
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  // Reply to email (optionally to a specific email in thread)
  const handleReply = (email?: EmailFull) => {
    const targetEmail = email || (thread.length > 0 ? thread[thread.length - 1] : selectedEmail);
    if (targetEmail) {
      setReplyTo(targetEmail);
      setForwardEmail(null);
      setReplyAll(false);
      setIsComposeOpen(true);
    }
  };

  // Reply all (optionally to a specific email in thread)
  const handleReplyAll = (email?: EmailFull) => {
    const targetEmail = email || (thread.length > 0 ? thread[thread.length - 1] : selectedEmail);
    if (targetEmail) {
      setReplyTo(targetEmail);
      setForwardEmail(null);
      setReplyAll(true);
      setIsComposeOpen(true);
    }
  };

  // Forward email (optionally a specific email in thread)
  const handleForward = (email?: EmailFull) => {
    const targetEmail = email || (thread.length > 0 ? thread[thread.length - 1] : selectedEmail);
    if (targetEmail) {
      setReplyTo(null);
      setForwardEmail(targetEmail);
      setReplyAll(false);
      setIsComposeOpen(true);
    }
  };

  // Toggle star for selected email
  const handleToggleStarSelected = () => {
    if (selectedEmail) {
      handleToggleStar(selectedEmail.uid);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Reset when folder changes
  useEffect(() => {
    setSelectedEmail(null);
    setThread([]);
    setPage(1);
    setSearchQuery("");
  }, [activeFolder]);

  // Auto-refresh polling for new emails
  useEffect(() => {
    const silentRefresh = async () => {
      // Don't poll if already polling or if searching
      if (isPollingRef.current || searchQuery) return;

      isPollingRef.current = true;

      try {
        // Fetch folders
        const foldersRes = await fetch("/api/mail/folders");
        const foldersData = await foldersRes.json();
        if (foldersData.folders) {
          setFolders(foldersData.folders);
        }

        // Fetch messages
        const params = new URLSearchParams({
          folder: activeFolder,
          page: page.toString(),
          limit: "50",
        });
        const messagesRes = await fetch(`/api/mail/messages?${params}`);
        const messagesData = await messagesRes.json();
        if (messagesData.messages) {
          setMessages(messagesData.messages);
          setPagination({
            total: messagesData.pagination?.total || 0,
            totalPages: messagesData.pagination?.totalPages || 1,
          });
        }
      } catch (error) {
        console.error("Silent refresh failed:", error);
      } finally {
        isPollingRef.current = false;
      }
    };

    const intervalId = setInterval(silentRefresh, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [activeFolder, page, searchQuery]);

  return (
    <div className="h-[calc(100vh-64px)]">
      <MailLayout
        sidebar={
          <FolderSidebar
            folders={folders}
            activeFolder={activeFolder}
            onFolderSelect={(path) => {
              setActiveFolder(path);
            }}
            onCompose={() => {
              setReplyTo(null);
              setForwardEmail(null);
              setReplyAll(false);
              setIsComposeOpen(true);
            }}
          />
        }
        list={
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                  />
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="btn-ghost p-2"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
            <EmailList
              messages={messages}
              selectedId={selectedEmail?.id}
              isLoading={isLoading}
              onSelect={(uid) => fetchEmail(uid)}
              onToggleStar={handleToggleStar}
              onDelete={handleMoveToTrash}
            />
            {pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {(page - 1) * 50 + 1}-
                  {Math.min(page * 50, pagination.total)} of {pagination.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page === pagination.totalPages}
                    className="btn-ghost px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        }
        detail={
          <EmailView
            email={selectedEmail}
            thread={thread}
            isLoading={isLoadingEmail}
            folder={activeFolder}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onDelete={() =>
              selectedEmail && handleMoveToTrash(selectedEmail.uid)
            }
            onToggleStar={handleToggleStarSelected}
            onClose={() => {
              setSelectedEmail(null);
              setThread([]);
            }}
            onLoadThread={() => selectedEmail && fetchThread(selectedEmail.uid)}
          />
        }
      />

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyTo(null);
          setForwardEmail(null);
          setReplyAll(false);
        }}
        replyTo={replyTo}
        forwardEmail={forwardEmail}
        replyAll={replyAll}
        onSent={() => {
          fetchFolders();
          if (activeFolder === "Sent") {
            fetchMessages();
          }
        }}
      />
    </div>
  );
}
