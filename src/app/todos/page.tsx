"use client";
import { useEffect, useState, useRef } from "react";
import { useCurrentUser } from "@/lib/UserContext";
import type { Todo, TodoPriority, User } from "@/lib/types";

// ── Roles ที่มองเห็น todo ของทุกคนในทีม ────────────────────────────────────
const MANAGER_ROLES = new Set([
  "admin", "Administrator", "Branch Manager",
  "Sales Manager", "Presales Manager", "Service Manager", "Operations Coordinator",
]);

function isManager(role: string) {
  return MANAGER_ROLES.has(role);
}

const PRIORITY_LABEL: Record<TodoPriority, string> = {
  low: "ต่ำ", normal: "ปกติ", high: "สูง", urgent: "ด่วนมาก",
};
const PRIORITY_COLOR: Record<TodoPriority, string> = {
  low: "text-muted border-border",
  normal: "text-blue-400 border-blue-800/50",
  high: "text-amber-400 border-amber-700/50",
  urgent: "text-rose-400 border-rose-700/60",
};
const PRIORITY_DOT: Record<TodoPriority, string> = {
  low: "bg-muted/40", normal: "bg-blue-500", high: "bg-amber-500", urgent: "bg-rose-500",
};

const today = new Date().toISOString().slice(0, 10);

function dayDiff(date?: string) {
  if (!date) return null;
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const n = new Date(); n.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - n.getTime()) / 86400000);
}

// ── Single Todo Card ─────────────────────────────────────────────────────────
function TodoCard({
  todo, canEdit, onToggle, onDelete, onEdit,
}: {
  todo: Todo; canEdit: boolean;
  onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const dd = dayDiff(todo.due_date);
  const overdue = dd !== null && dd < 0 && todo.status === "pending";
  const dueSoon = dd !== null && dd >= 0 && dd <= 2 && todo.status === "pending";

  return (
    <div className={`group flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
      todo.status === "done"
        ? "bg-card/40 border-border/40 opacity-60"
        : todo.pinned
        ? "bg-accent/5 border-accent/30"
        : overdue
        ? "bg-rose-950/20 border-rose-800/40"
        : "bg-card border-border hover:border-border/80"
    }`}>
      {/* Checkbox */}
      <button onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          todo.status === "done"
            ? "bg-green-600 border-green-600 text-white"
            : "border-border hover:border-accent"
        }`}>
        {todo.status === "done" && <span className="text-[10px]">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${todo.status === "done" ? "line-through text-muted" : ""}`}>
            {todo.pinned && <span className="mr-1 text-accent">📌</span>}
            {todo.title}
          </p>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <>
                <button onClick={onEdit} className="text-[10px] text-muted hover:text-accent px-1.5 py-0.5 rounded hover:bg-accent/10">แก้ไข</button>
                <button onClick={onDelete} className="text-[10px] text-muted hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-rose-950/30">ลบ</button>
              </>
            )}
          </div>
        </div>

        {todo.description && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{todo.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority */}
          <span className={`text-[10px] border rounded px-1.5 py-0.5 font-medium ${PRIORITY_COLOR[todo.priority]}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PRIORITY_DOT[todo.priority]}`} />
            {PRIORITY_LABEL[todo.priority]}
          </span>

          {/* Due date */}
          {todo.due_date && (
            <span className={`text-[10px] rounded px-1.5 py-0.5 ${
              overdue ? "bg-rose-900/40 text-rose-300" :
              dueSoon ? "bg-amber-900/30 text-amber-300" :
              "text-muted"
            }`}>
              {overdue ? "⚠️ เลย " : dueSoon ? "⏰ " : "📅 "}
              {todo.due_date}
              {dd !== null && todo.status === "pending" && (
                <span className="ml-1">({dd === 0 ? "วันนี้" : dd > 0 ? `${dd}d` : `เลย${Math.abs(dd)}d`})</span>
              )}
            </span>
          )}

          {/* Related */}
          {todo.related_customer && (
            <span className="text-[10px] text-muted">🏢 {todo.related_customer}</span>
          )}
          {todo.related_project && (
            <span className="text-[10px] text-muted">📁 {todo.related_project}</span>
          )}

          {/* Created by */}
          {todo.created_by !== todo.user_name && (
            <span className="text-[10px] text-accent/60">มอบหมายโดย {todo.created_by}</span>
          )}

          {/* Done time */}
          {todo.status === "done" && todo.done_at && (
            <span className="text-[10px] text-muted">เสร็จ {todo.done_at.slice(0, 10)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Form ────────────────────────────────────────────────────────────
function TodoForm({
  initial, targetUser, allUsers, currentUser, onSave, onCancel,
}: {
  initial?: Partial<Todo>;
  targetUser: string;
  allUsers: User[];
  currentUser: User;
  onSave: (data: Partial<Todo>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TodoPriority>(initial?.priority ?? "normal");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [assignTo, setAssignTo] = useState(initial?.user_name ?? targetUser);
  const [customer, setCustomer] = useState(initial?.related_customer ?? "");
  const [project, setProject] = useState(initial?.related_project ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const canAssignOthers = isManager(currentUser.role);

  function submit() {
    if (!title.trim()) return;
    onSave({
      user_name: canAssignOthers ? assignTo : currentUser.name,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      related_customer: customer.trim() || undefined,
      related_project: project.trim() || undefined,
      pinned,
    });
  }

  return (
    <div className="rounded-2xl bg-card border border-accent/30 p-4 space-y-3">
      {/* Assign to (manager only) */}
      {canAssignOthers && (
        <div>
          <label className="text-[11px] text-muted block mb-1">มอบหมายให้</label>
          <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
            className="w-full rounded-xl bg-background border border-border px-3 py-1.5 text-sm">
            {allUsers.map(u => (
              <option key={u.id} value={u.name}>{u.nickname || u.name} ({u.role})</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="ชื่องาน / memo *"
        className="w-full rounded-xl bg-background border border-border px-3 py-2 text-sm" />

      {/* Description */}
      <textarea value={description} onChange={e => setDescription(e.target.value)}
        rows={2} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
        className="w-full rounded-xl bg-background border border-border px-3 py-2 text-sm resize-none" />

      <div className="grid grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <label className="text-[11px] text-muted block mb-1">ความสำคัญ</label>
          <select value={priority} onChange={e => setPriority(e.target.value as TodoPriority)}
            className="w-full rounded-xl bg-background border border-border px-3 py-1.5 text-sm">
            <option value="low">ต่ำ</option>
            <option value="normal">ปกติ</option>
            <option value="high">สูง</option>
            <option value="urgent">ด่วนมาก</option>
          </select>
        </div>
        {/* Due date */}
        <div>
          <label className="text-[11px] text-muted block mb-1">กำหนดส่ง</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-xl bg-background border border-border px-3 py-1.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-muted block mb-1">ลูกค้าที่เกี่ยวข้อง</label>
          <input value={customer} onChange={e => setCustomer(e.target.value)}
            className="w-full rounded-xl bg-background border border-border px-3 py-1.5 text-sm" placeholder="ชื่อลูกค้า (ถ้ามี)" />
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">โปรเจคที่เกี่ยวข้อง</label>
          <input value={project} onChange={e => setProject(e.target.value)}
            className="w-full rounded-xl bg-background border border-border px-3 py-1.5 text-sm" placeholder="ชื่อโปรเจค (ถ้ามี)" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setPinned(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${pinned ? "bg-accent/15 border-accent/40 text-accent" : "border-border text-muted hover:bg-card-hover"}`}>
          📌 {pinned ? "ปักหมุดแล้ว" : "ปักหมุด"}
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={!title.trim()}
          className="rounded-xl bg-accent text-white px-5 py-2 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
          {initial?.id ? "บันทึก" : "เพิ่ม Todo"}
        </button>
        <button onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:bg-card-hover transition-colors">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TodosPage() {
  const { currentUser, users: allUsersCtx, loading: userLoading } = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>(""); // "" = own todos (for non-manager)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("pending");
  const [viewMode, setViewMode] = useState<"mine" | "team">("mine");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || userLoading) return;
    loadData();
  }, [mounted, userLoading]);

  async function loadData() {
    setLoading(true);
    try {
      const fs = await import("@/lib/firestore");
      const [td, us] = await Promise.all([fs.todos.list(), fs.users.list()]);
      setTodos(td);
      setAllUsers(us.filter(u => u.active));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (!mounted || userLoading) return <div className="p-6 text-muted text-sm">Loading...</div>;
  if (!currentUser) return <div className="p-6 text-muted text-sm">กรุณาเข้าสู่ระบบ</div>;

  const manager = isManager(currentUser.role);
  const myName = currentUser.name;

  // กำหนดว่า user ไหนที่จะโชว์ todos
  const activeTarget = viewMode === "mine" ? myName : (selectedUser || myName);

  // todos ที่จะแสดง
  const visibleTodos = (() => {
    let list = todos;
    if (viewMode === "mine") {
      list = list.filter(t => t.user_name === myName);
    } else {
      // team view — manager เท่านั้น
      if (selectedUser) list = list.filter(t => t.user_name === selectedUser);
    }
    if (filterStatus !== "all") list = list.filter(t => t.status === filterStatus);
    // pinned ขึ้นก่อน, pending ก่อน done, urgent ก่อน
    const priorityOrder: Record<TodoPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  })();

  // สรุปต่อคน (สำหรับ manager overview)
  const teamSummary = allUsers.map(u => {
    const userTodos = todos.filter(t => t.user_name === u.name);
    const pending = userTodos.filter(t => t.status === "pending").length;
    const overdue = userTodos.filter(t => t.status === "pending" && t.due_date && t.due_date < today).length;
    const urgent = userTodos.filter(t => t.status === "pending" && (t.priority === "urgent" || t.priority === "high")).length;
    return { user: u, pending, overdue, urgent, total: userTodos.length };
  }).filter(x => x.total > 0 || x.user.name === myName)
    .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending);

  async function handleSave(data: Partial<Todo>) {
    if (!currentUser) return;
    try {
      const fs = await import("@/lib/firestore");
      if (editTodo?.id) {
        await fs.todos.update(editTodo.id, {
          ...data,
          updated_at: today,
        } as Record<string, unknown>);
      } else {
        await fs.todos.add({
          ...data,
          status: "pending",
          created_by: myName,
          updated_at: today,
        } as Record<string, unknown>);
      }
      setShowForm(false);
      setEditTodo(null);
      await loadData();
    } catch (e) { console.error(e); }
  }

  async function handleToggle(todo: Todo) {
    if (!todo.id) return;
    try {
      const fs = await import("@/lib/firestore");
      const newStatus = todo.status === "done" ? "pending" : "done";
      await fs.todos.update(todo.id, {
        status: newStatus,
        done_at: newStatus === "done" ? today : null,
        updated_at: today,
      } as Record<string, unknown>);
      await loadData();
    } catch (e) { console.error(e); }
  }

  async function handleDelete(todo: Todo) {
    if (!todo.id) return;
    try {
      const fs = await import("@/lib/firestore");
      await fs.todos.remove(todo.id);
      await loadData();
    } catch (e) { console.error(e); }
  }

  const canEditTodo = (todo: Todo) =>
    todo.user_name === myName || todo.created_by === myName || manager;

  const pendingCount = todos.filter(t => t.user_name === myName && t.status === "pending").length;
  const urgentCount = todos.filter(t => t.user_name === myName && t.status === "pending" && (t.priority === "urgent" || t.priority === "high")).length;

  return (
    <div className="p-5 max-w-[1100px]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold">📝 Memo & Todo</h1>
          <p className="text-xs text-muted mt-0.5">
            รายการงานส่วนตัว{manager ? " · คุณมองเห็น Todo ของทีมได้ทั้งหมด" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode (manager only) */}
          {manager && (
            <div className="flex rounded-xl border border-border bg-card p-0.5">
              <button onClick={() => setViewMode("mine")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "mine" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>
                งานของฉัน
              </button>
              <button onClick={() => setViewMode("team")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "team" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>
                ทีมทั้งหมด
              </button>
            </div>
          )}
          {/* Status filter */}
          <div className="flex rounded-xl border border-border bg-card p-0.5">
            {(["pending", "all", "done"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-accent/80 text-white" : "text-muted hover:text-foreground"}`}>
                {s === "pending" ? "รอดำเนินการ" : s === "done" ? "เสร็จแล้ว" : "ทั้งหมด"}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowForm(true); setEditTodo(null); }}
            className="rounded-xl bg-accent text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
            + เพิ่ม Todo
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-sm">กำลังโหลด...</p>
      ) : (
        <div className={`${manager && viewMode === "team" ? "grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5" : ""}`}>

          {/* ── TEAM SIDEBAR (manager + team view) ─────────────────────────── */}
          {manager && viewMode === "team" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted uppercase tracking-widest font-medium px-1 mb-2">ภาพรวมทีม</p>
              {/* All */}
              <button onClick={() => setSelectedUser("")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${!selectedUser ? "bg-accent/10 border-accent/30 text-accent" : "bg-card border-border hover:bg-card-hover"}`}>
                <span className="font-medium">ทุกคน</span>
                <span className="text-xs text-muted">{todos.filter(t => t.status === "pending").length} pending</span>
              </button>
              {teamSummary.map(({ user: u, pending, overdue, urgent }) => (
                <button key={u.id} onClick={() => setSelectedUser(u.name)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${selectedUser === u.name ? "bg-accent/10 border-accent/30" : "bg-card border-border hover:bg-card-hover"}`}>
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {(u.nickname || u.name).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nickname || u.name}</p>
                    <p className="text-[10px] text-muted">{u.role}</p>
                    <div className="flex gap-2 mt-1">
                      {pending > 0 && <span className="text-[10px] text-blue-400">{pending} รอ</span>}
                      {overdue > 0 && <span className="text-[10px] text-rose-400">{overdue} เลย</span>}
                      {urgent > 0 && <span className="text-[10px] text-amber-400">{urgent} ด่วน</span>}
                      {pending === 0 && <span className="text-[10px] text-green-400">✓ เสร็จหมด</span>}
                    </div>
                  </div>
                </button>
              ))}
              {teamSummary.length === 0 && (
                <p className="text-xs text-muted px-2">ยังไม่มีข้อมูล</p>
              )}
            </div>
          )}

          {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* My stats (mine view) */}
            {viewMode === "mine" && (pendingCount > 0 || urgentCount > 0) && (
              <div className="flex gap-3 mb-1">
                {pendingCount > 0 && (
                  <div className="rounded-xl bg-blue-950/30 border border-blue-800/30 px-4 py-2 text-center">
                    <p className="text-xl font-bold text-blue-400">{pendingCount}</p>
                    <p className="text-[10px] text-muted">รอดำเนินการ</p>
                  </div>
                )}
                {urgentCount > 0 && (
                  <div className="rounded-xl bg-rose-950/30 border border-rose-800/30 px-4 py-2 text-center">
                    <p className="text-xl font-bold text-rose-400">{urgentCount}</p>
                    <p className="text-[10px] text-muted">ด่วน / สำคัญ</p>
                  </div>
                )}
              </div>
            )}

            {/* Viewing label (team mode) */}
            {viewMode === "team" && (
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">
                  {selectedUser ? (
                    <>
                      {allUsers.find(u => u.name === selectedUser)?.nickname || selectedUser}
                      <span className="text-muted font-normal ml-1 text-xs">
                        ({allUsers.find(u => u.name === selectedUser)?.role})
                      </span>
                    </>
                  ) : "ทุกคนในทีม"}
                </p>
                <span className="text-xs text-muted">{visibleTodos.length} รายการ</span>
              </div>
            )}

            {/* Add form */}
            {showForm && !editTodo && (
              <TodoForm
                targetUser={viewMode === "team" && selectedUser ? selectedUser : myName}
                allUsers={allUsers}
                currentUser={currentUser}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
              />
            )}

            {/* Edit form */}
            {editTodo && (
              <TodoForm
                initial={editTodo}
                targetUser={editTodo.user_name}
                allUsers={allUsers}
                currentUser={currentUser}
                onSave={handleSave}
                onCancel={() => setEditTodo(null)}
              />
            )}

            {/* Todo list */}
            {visibleTodos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-muted text-sm">
                  {filterStatus === "done" ? "ยังไม่มีงานที่เสร็จแล้ว" :
                   filterStatus === "pending" ? "ไม่มีงานค้างอยู่ 🎉" : "ยังไม่มี Todo"}
                </p>
                {filterStatus === "pending" && (
                  <button onClick={() => setShowForm(true)}
                    className="mt-3 text-xs text-accent hover:underline">
                    + เพิ่ม Todo แรก
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTodos.map(t => (
                  <TodoCard
                    key={t.id}
                    todo={t}
                    canEdit={canEditTodo(t)}
                    onToggle={() => handleToggle(t)}
                    onDelete={() => handleDelete(t)}
                    onEdit={() => { setEditTodo(t); setShowForm(false); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
