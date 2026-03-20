import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { projectService, type Project } from "../../api/project.api";
import type { AxiosError } from "axios";

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Rename
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState("");

  // Delete
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Newly created key reveal
  const [newProjectId, setNewProjectId] = useState<string | null>(null);

  useEffect(() => {
    projectService
      .list()
      .then(({ data }) => setProjects(data.data.projects))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Create ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!createName.trim()) return;
    setCreateError("");
    setCreateLoading(true);
    try {
      const { data } = await projectService.create({ name: createName.trim() });
      setProjects((prev) => [data.data.project, ...prev]);
      setNewProjectId(data.data.project.id);
      setCreateOpen(false);
      setCreateName("");
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setCreateError(e.response?.data?.error ?? "Failed to create project.");
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Rename ─────────────────────────────────────────────────────────────────

  function openRename(p: Project) {
    setRenameProject(p);
    setRenameName(p.name);
    setRenameError("");
  }

  async function handleRename() {
    if (!renameProject || !renameName.trim()) return;
    setRenameError("");
    setRenameLoading(true);
    try {
      const { data } = await projectService.update(renameProject.id, {
        name: renameName.trim(),
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === renameProject.id ? data.data.project : p)),
      );
      setRenameProject(null);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setRenameError(e.response?.data?.error ?? "Failed to rename project.");
    } finally {
      setRenameLoading(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteProject) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await projectService.delete(deleteProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id));
      setDeleteProject(null);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setDeleteError(e.response?.data?.error ?? "Failed to delete project.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: "clamp(20px,4vw,40px)",
        maxWidth: 1080,
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
            Projects
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Each project gets its own API keys and user base.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setCreateOpen(true);
          }}
          className="btn-primary"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Table */}
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
            style={{ padding: 40, display: "flex", justifyContent: "center" }}
          >
            <Spinner size={18} />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
            title="No projects"
            description="Create a project to generate API keys and start authenticating users in your app."
            action={
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-primary"
              >
                New Project
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>API Keys</th>
                    <th>Users</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      style={{
                        background:
                          newProjectId === p.id
                            ? "rgba(99,102,241,0.04)"
                            : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 500, color: "#ededed" }}>
                        {p.name}
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.06)",
                            color: "#888",
                          }}
                        >
                          {p.slug}
                        </span>
                      </td>
                      <td>{p.keyCount}</td>
                      <td>{p.userCount}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 12,
                          }}
                        >
                          <button
                            onClick={() => openRename(p)}
                            style={{
                              fontSize: 12,
                              color: "#555",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#ededed")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "#555")
                            }
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError("");
                              setDeleteProject(p);
                            }}
                            style={{
                              fontSize: 12,
                              color: "rgba(248,113,113,0.7)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#f87171")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color =
                                "rgba(248,113,113,0.7)")
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div
              className="md:hidden"
              style={{ display: "flex", flexDirection: "column" }}
            >
              {projects.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    padding: "16px",
                    borderBottom:
                      i < projects.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ededed",
                      }}
                    >
                      {p.name}
                    </span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => openRename(p)}
                        style={{
                          fontSize: 12,
                          color: "#555",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError("");
                          setDeleteProject(p);
                        }}
                        style={{
                          fontSize: 12,
                          color: "rgba(248,113,113,0.7)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      Slug:{" "}
                      <span style={{ fontFamily: "monospace", color: "#888" }}>
                        {p.slug}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {p.keyCount} keys
                    </span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {p.userCount} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Project"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {createError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                color: "#f87171",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {createError}
            </div>
          )}
          <Input
            label="Project Name"
            placeholder="My App"
            value={createName}
            onChange={(e) => {
              setCreateName(e.target.value);
              setCreateError("");
            }}
            hint="Used to identify your project in the dashboard."
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setCreateOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createLoading || !createName.trim()}
              className="btn-primary"
            >
              {createLoading ? <Spinner size={13} /> : "Create Project"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={!!renameProject}
        onClose={() => setRenameProject(null)}
        title="Rename Project"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {renameError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                color: "#f87171",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {renameError}
            </div>
          )}
          <Input
            label="Project Name"
            value={renameName}
            onChange={(e) => {
              setRenameName(e.target.value);
              setRenameError("");
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setRenameProject(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={renameLoading || !renameName.trim()}
              className="btn-primary"
            >
              {renameLoading ? <Spinner size={13} /> : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteProject}
        onClose={() => setDeleteProject(null)}
        title="Delete Project"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {deleteError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                color: "#f87171",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {deleteError}
            </div>
          )}
          <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "#ededed" }}>{deleteProject?.name}</strong>?
            This will permanently remove all its API keys and end users.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setDeleteProject(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="btn-danger"
            >
              {deleteLoading ? <Spinner size={13} /> : "Delete Project"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
