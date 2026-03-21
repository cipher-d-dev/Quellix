import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationService,
  type Notification,
  type NotificationPagination,
} from "../../api/notification.api";
import { Spinner } from "../../components/ui/Spinner";

const TYPE_ICONS: Record<string, string> = {
  TEAM_INVITE: "👥",
  TEAM_ACCEPTED: "✅",
  ANNOUNCEMENT: "📣",
  SYSTEM: "⚙️",
};

const TYPE_LABELS: Record<string, string> = {
  TEAM_INVITE: "Team Invite",
  TEAM_ACCEPTED: "Team Accepted",
  ANNOUNCEMENT: "Announcement",
  SYSTEM: "System",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<NotificationPagination | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    notificationService
      .listPaginated(page)
      .then(({ data }) => {
        setNotifications(data.data.notifications);
        setPagination(data.data.pagination);
        setUnreadCount(data.data.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  async function handleMarkRead(id: string) {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleDelete(id: string, wasRead: boolean) {
    await notificationService.delete(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!wasRead) setUnreadCount((prev) => Math.max(0, prev - 1));
    if (pagination) {
      setPagination((prev) =>
        prev
          ? {
              ...prev,
              total: prev.total - 1,
              totalPages: Math.ceil((prev.total - 1) / prev.limit),
            }
          : prev,
      );
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      setPagination(null);
      setConfirmDeleteAll(false);
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(18px,3vw,22px)",
              fontWeight: 600,
              color: "#fafafa",
              letterSpacing: -0.5,
              margin: 0,
            }}
          >
            Notifications
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary"
              style={{ fontSize: 13 }}
            >
              Mark all read
            </button>
          )}
          {(pagination?.total ?? 0) > 0 && !confirmDeleteAll && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="btn-danger"
              style={{ fontSize: 13 }}
            >
              Delete all
            </button>
          )}
          {confirmDeleteAll && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>Sure?</span>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="btn-danger"
                style={{ fontSize: 12 }}
              >
                {deletingAll ? <Spinner size={12} /> : "Yes, delete all"}
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="btn-secondary"
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div
        className="animate-slide-up"
        style={{
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{ padding: 48, display: "flex", justifyContent: "center" }}
          >
            <Spinner size={18} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>🔔</p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#ededed",
                margin: "0 0 6px",
              }}
            >
              No notifications
            </p>
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
              You're all caught up. We'll notify you about team activity and
              platform updates.
            </p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div
              key={n.id}
              style={{
                padding: "16px 20px",
                borderBottom:
                  i < notifications.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
                background: n.read ? "transparent" : "rgba(99,102,241,0.04)",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                {TYPE_ICONS[n.type] ?? "🔔"}
              </span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: n.read ? "#888" : "#ededed",
                      margin: 0,
                    }}
                  >
                    {n.title}
                  </p>
                  {!n.read && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#6366f1",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 7px",
                      borderRadius: 99,
                      background: "rgba(255,255,255,0.06)",
                      color: "#555",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#666",
                    margin: "0 0 6px",
                    lineHeight: 1.6,
                  }}
                >
                  {n.body}
                </p>
                <p style={{ fontSize: 11, color: "#444", margin: 0 }}>
                  {timeAgo(n.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flexShrink: 0,
                  alignItems: "flex-end",
                }}
              >
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    style={{
                      fontSize: 11,
                      color: "#818cf8",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id, n.read)}
                  style={{
                    fontSize: 11,
                    color: "rgba(248,113,113,0.6)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f87171")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(248,113,113,0.6)")
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
            Page {pagination.page} of {pagination.totalPages} ·{" "}
            {pagination.total} total
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary"
              style={{ fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
              className="btn-secondary"
              style={{
                fontSize: 12,
                opacity: page === pagination.totalPages ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
