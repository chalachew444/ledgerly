"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Circle, CircleCheck, Clock3, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { loadTasks, removeTask, saveTask, updateTaskStatus } from "@/lib/client-store";
import { demoTasks } from "@/lib/demo-data";
import type { FinanceTask, TaskStatus } from "@/lib/finance-types";

const columns: { status: TaskStatus; label: string; caption: string; color: string; icon: typeof Circle }[] = [
  { status: "TODO", label: "To do", caption: "On the list", color: "text-[#8b806e]", icon: Circle },
  { status: "IN_PROGRESS", label: "In progress", caption: "Underway", color: "text-[#bd7958]", icon: Clock3 },
  { status: "COMPLETED", label: "Completed", caption: "Wrapped up", color: "text-[#60836a]", icon: CircleCheck },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<FinanceTask[]>(demoTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTask>();
  const [today, setToday] = useState<string | null>(null);

  async function refresh() { setTasks(await loadTasks()); }
  useEffect(() => {
    let active = true;
    void loadTasks().then((items) => { if (active) startTransition(() => { setTasks(items); setToday(new Date().toISOString().slice(0, 10)); }); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    total: tasks.length,
    open: tasks.filter((task) => task.status !== "COMPLETED").length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
  }), [tasks]);

  async function changeStatus(task: FinanceTask, status: TaskStatus) {
    await updateTaskStatus(task, status);
    await refresh();
  }

  async function deleteItem(task: FinanceTask) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    await removeTask(task.id);
    await refresh();
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#819087]">Keep things moving</p><h1 className="text-[27px] font-semibold leading-tight">Finance tasks</h1><p className="mt-2 text-sm text-[#7b857c] dark:text-[#aab4ac]">A lightweight board for the work behind your numbers.</p></div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="size-4" /> Add task</Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <CountSummary label="All tasks" count={counts.total} icon={<ListTodo className="size-4" />} />
        <CountSummary label="Open" count={counts.open} icon={<Clock3 className="size-4" />} />
        <CountSummary label="Completed" count={counts.completed} icon={<Check className="size-4" />} />
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-3">
        {columns.map(({ status, label, caption, color, icon: Icon }) => {
          const items = tasks.filter((task) => task.status === status);
          return <div key={status} className="min-w-0 rounded-md border border-[#e7e4dc] bg-[#f0efe9] p-3.5 dark:border-[#2d3932] dark:bg-[#1a231e]">
            <div className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2"><Icon className={`size-4 ${color}`} /><div><h2 className="text-xs font-semibold">{label}</h2><p className="text-[10px] text-[#929990]">{caption}</p></div></div><span className="grid size-6 place-items-center rounded bg-white text-[10px] font-medium text-[#758078] dark:bg-[#2b352e] dark:text-[#c0c8c0]">{items.length}</span></div>
            <div className="space-y-2.5">
              {items.map((task) => <article key={task.id} className="rounded-md border border-[#e5e2da] bg-[#fffefa] p-3.5 dark:border-[#344139] dark:bg-[#202a24]">
                <div className="flex items-start justify-between gap-2"><h3 className="text-xs font-semibold leading-5">{task.title}</h3><div className="flex shrink-0 gap-0.5"><button title="Edit task" aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task); setDialogOpen(true); }} className="grid size-7 place-items-center rounded text-[#89938a] hover:bg-[#f1f0eb] hover:text-[#34463b] dark:hover:bg-[#303b34]"><Pencil className="size-3.5" /></button><button title="Delete task" aria-label={`Delete ${task.title}`} onClick={() => void deleteItem(task)} className="grid size-7 place-items-center rounded text-[#a0877b] hover:bg-[#f7e9e3] hover:text-[#aa583e] dark:hover:bg-[#3b2b25]"><Trash2 className="size-3.5" /></button></div></div>
                {task.description && <p className="mt-1.5 text-[11px] leading-[1.55] text-[#818b82] dark:text-[#a8b2aa]">{task.description}</p>}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f0eee8] pt-2.5 dark:border-[#303b34]">
                  {task.dueDate ? <span className={`flex items-center gap-1.5 text-[10px] ${today && task.dueDate.slice(0, 10) < today && task.status !== "COMPLETED" ? "text-[#b05d3e]" : "text-[#8b948b]"}`}><CalendarDays className="size-3" />Due {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(task.dueDate))}</span> : <span className="text-[10px] text-[#a1a79f]">No due date</span>}
                  <select aria-label={`Change status for ${task.title}`} value={status} onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)} className="max-w-30 rounded border border-[#e3e1d9] bg-[#fbfaf7] px-2 py-1 text-[10px] text-[#657168] outline-none dark:border-[#3a473f] dark:bg-[#26312a] dark:text-[#d0d7d0]"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select>
                </div>
              </article>)}
              {!items.length && <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-[#d9d8d0] px-4 text-center dark:border-[#354139]"><p className="text-[11px] text-[#929990]">Nothing here yet</p></div>}
            </div>
            {status !== "COMPLETED" && <button onClick={() => { setEditing(undefined); setDialogOpen(true); }} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded text-xs font-medium text-[#748078] transition-colors hover:bg-white hover:text-[#314438] dark:hover:bg-[#28332c] dark:hover:text-white"><Plus className="size-3.5" /> Add task</button>}
          </div>;
        })}
      </section>

      <TaskDialog key={`${dialogOpen ? "open" : "closed"}-${dialogOpen ? editing?.id ?? "new" : "idle"}`} open={dialogOpen} onOpenChange={setDialogOpen} task={editing} onSave={async (values) => { await saveTask(values); await refresh(); }} />
    </div>
  );
}

function CountSummary({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return <article className="flex items-center justify-between rounded-md border border-[#e7e4dc] bg-[#fffefa] px-4 py-3.5 dark:border-[#2d3932] dark:bg-[#19211d]"><div><p className="text-[11px] text-[#89938a]">{label}</p><p className="mt-1 text-lg font-semibold">{count}</p></div><span className="grid size-8 place-items-center rounded-md bg-[#e8ede7] text-[#607968] dark:bg-[#2b3a31] dark:text-[#b2c9b2]">{icon}</span></article>;
}

function TaskDialog({ open, onOpenChange, task, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; task?: FinanceTask; onSave: (values: Omit<FinanceTask, "id"> & { id?: string }) => Promise<void> }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...(task ? { id: task.id } : {}), title: title.trim(), description: description.trim() || null, status, dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null });
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle><DialogDescription>Keep financial follow-ups and business admin in one place.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Task title<Input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Reconcile business account" /></label><label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Description <span className="font-normal text-[#9aa198]">(optional)</span><textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context..." className="min-h-20.5 w-full resize-y rounded-md border border-[#ddd9d2] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#929990] focus:border-[#81998b] dark:border-[#35423d] dark:bg-[#19221e]" /></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Status<select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="h-10 w-full rounded-md border border-[#ddd9d2] bg-white px-3 text-sm dark:border-[#35423d] dark:bg-[#19221e]"><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></label><label className="block space-y-1.5 text-xs font-medium text-[#68736b] dark:text-[#b2bbb4]">Due date<Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : task ? "Save changes" : "Add task"}</Button></div></form></DialogContent></Dialog>;
}