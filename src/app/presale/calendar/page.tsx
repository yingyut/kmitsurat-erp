"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PresaleRequest, PresaleWorkStep, User } from "@/lib/types";

const typeLabels: Record<string, string> = { solution_design: "Design", requirement_summary: "Requirement", boq: "BOQ", technical_proposal: "Proposal", site_survey: "Survey", project_planning: "Planning" };
const statusColor: Record<string, string> = { pending: "bg-blue-500", in_progress: "bg-yellow-500", completed: "bg-green-500" };
const statusLabel: Record<string, string> = { pending: "รอเริ่ม", in_progress: "กำลังทำ", completed: "เสร็จ" };
const STEP_META: Record<PresaleWorkStep["type"], { icon: string; label: string }> = {
  research:     { icon: "🔍", label: "ค้นหาข้อมูล" },
  presentation: { icon: "🎤", label: "สร้างไฟล์นำเสนอ" },
  boq:          { icon: "💰", label: "จัดทำ BOQ" },
  bom:          { icon: "🛒", label: "จัดทำ BOM" },
  design:       { icon: "🎨", label: "ออกแบบระบบ" },
  site_visit:   { icon: "📍", label: "สำรวจหน้างาน" },
  other:        { icon: "📝", label: "อื่นๆ" },
};
const STEP_STATUS_DOT: Record<string, string> = { pending: "bg-slate-500", in_progress: "bg-amber-400", done: "bg-green-500" };

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export default function PresaleCalendarPage() {
  const [requests, setRequests] = useState<PresaleRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [personFilter, setPersonFilter] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date().toISOString().slice(0, 10);

  // no-op — ข้อมูลอัปเดตอัตโนมัติผ่าน onSnapshot subscriptions
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function load() {}

  useEffect(() => {
    setMounted(true);
    const unsubs: Array<() => void> = [];
    let firstSnap = true;
    (async () => {
      const fs = await import("@/lib/firestore");
      unsubs.push(
        fs.presaleRequests.subscribe(data => {
          setRequests(data);
          if (firstSnap) { setLoading(false); firstSnap = false; }
        }),
        fs.users.subscribe(data => setUsers(data.filter(x => x.active !== false && x.role === "presale"))),
      );
    })();
    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter
  const filtered = personFilter === "all" ? requests : requests.filter(r => r.assigned_to === personFilter);

  // Work steps — flat list
  type StepEntry = { request: PresaleRequest; step: PresaleWorkStep };
  const allSteps: StepEntry[] = filtered.flatMap(r =>
    (r.work_steps || []).map(s => ({ request: r, step: s }))
  );
  function stepsOnDate(ds: string): StepEntry[] {
    return allSteps.filter(e => e.step.start_date === ds);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  // Jobs per date
  function jobsOnDate(dateStr: string) {
    return filtered.filter(r => r.due_date === dateStr);
  }

  // Jobs per person summary
  const personSummary = users.map(u => {
    const mine = filtered.filter(r => r.assigned_to === u.name);
    const active = mine.filter(r => r.status !== "completed").length;
    const done = mine.filter(r => r.status === "completed").length;
    const overdue = mine.filter(r => r.due_date && r.due_date < today && r.status !== "completed").length;
    return { name: u.name, shortName: (u.nickname || u.name).split(" ")[0].replace(/[()]/g, ""), active, done, overdue, total: mine.length };
  }).filter(p => p.total > 0);

  // Selected date jobs
  const selectedJobs = selectedDate ? jobsOnDate(selectedDate) : [];

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); }
  function goToday() { setCurrentDate(new Date()); setSelectedDate(today); }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Color for person (consistent)
  const personColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#f43f5e", "#22c55e"];
  function personColor(name: string) {
    const idx = users.findIndex(u => u.name === name);
    return personColors[idx % personColors.length];
  }

  if (!mounted) return <div className="p-6"><p className="text-muted">Loading...</p></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" title="ปฏิทินงาน Presale">Presale Calendar</h1>
          <p className="text-xs text-muted">ดูตารางงาน Presale ว่าใครติดงานวันไหน</p>
        </div>
        <div className="flex gap-2">
          <Link href="/presale" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-card-hover">← Presale Tasks</Link>
        </div>
      </div>

      {/* Person filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setPersonFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs ${personFilter === "all" ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>ทุกคน</button>
        {users.map((u, i) => (
          <button key={u.id} onClick={() => setPersonFilter(personFilter === u.name ? "all" : u.name)}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${personFilter === u.name ? "bg-accent text-white" : "bg-card border border-border text-muted hover:bg-card-hover"}`}>
            <span className="w-2 h-2 rounded-full" style={{ background: personColors[i % personColors.length] }} />
            {(u.nickname || u.name).split(" ")[0].replace(/[()]/g, "")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-card-hover">← ก่อนหน้า</button>
            <div className="text-center">
              <p className="text-base font-bold">{MONTHS_TH[month]} {year + 543}</p>
              <button onClick={goToday} className="text-[10px] text-accent hover:underline">วันนี้</button>
            </div>
            <button onClick={nextMonth} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-card-hover">ถัดไป →</button>
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS_TH.map((d, i) => (
                <div key={d} className={`text-center text-xs py-2 font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted"}`}>{d}</div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border last:border-0">
                {week.map((day, di) => {
                  if (day === null) return <div key={di} className="min-h-[80px] bg-background/30" />;
                  const ds = dateStr(day);
                  const jobs = jobsOnDate(ds);
                  const steps = stepsOnDate(ds);
                  const isToday = ds === today;
                  const isSelected = ds === selectedDate;
                  const isPast = ds < today;
                  const totalItems = jobs.length + steps.length;
                  return (
                    <button key={di} onClick={() => setSelectedDate(isSelected ? null : ds)}
                      className={`min-h-[90px] p-1 text-left transition-colors border-r border-border last:border-0 ${isSelected ? "bg-accent/10" : "hover:bg-card-hover"} ${isPast && !isToday ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between px-1">
                        <span className={`text-xs font-medium ${isToday ? "bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center" : di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : ""}`}>{day}</span>
                        {totalItems > 0 && <span className="text-[9px] text-muted">{totalItems}</span>}
                      </div>
                      {/* Task due date dots */}
                      <div className="mt-1 space-y-0.5 px-0.5">
                        {jobs.slice(0, 2).map(j => (
                          <div key={j.id} className="flex items-center gap-1 text-[8px] leading-tight truncate">
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusColor[j.status]}`} />
                            <span className="truncate" style={{ color: personColor(j.assigned_to) }}>{(j.assigned_to || "").split(" ")[0].replace(/[()]/g, "")}</span>
                          </div>
                        ))}
                        {/* Work step rows */}
                        {steps.slice(0, 2).map((e, si) => (
                          <div key={`s${si}`} className="flex items-center gap-1 text-[8px] leading-tight truncate">
                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${STEP_STATUS_DOT[e.step.status]}`} />
                            <span className="shrink-0">{STEP_META[e.step.type].icon}</span>
                            <span className="truncate text-purple-300">{e.step.assignee || (e.request.assigned_to || "").split(" ")[0]}</span>
                          </div>
                        ))}
                        {totalItems > 4 && <p className="text-[8px] text-muted">+{totalItems - 4} more</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-2 text-[10px] text-muted flex-wrap">
            <span className="font-medium text-muted/60">กำหนดส่ง:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> รอเริ่ม</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> กำลังทำ</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> เสร็จ</span>
            <span className="font-medium text-muted/60 ml-2">แผนงาน:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> รอ</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> กำลังทำ</span>
            <span className="flex items-center gap-1"><span className="text-purple-300">🗓 ชื่อสีม่วง</span> = แผนงาน step</span>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Person summary */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-semibold mb-2" title="สรุปภาระงาน Presale">สรุปภาระงาน</h3>
            {personSummary.length === 0 ? <p className="text-xs text-muted">ไม่มีข้อมูล</p> : (
              <div className="space-y-2">
                {personSummary.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: personColor(p.name) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.shortName}</p>
                      <div className="flex gap-1.5 text-[9px]">
                        {p.overdue > 0 && <span className="text-red-400">⚠{p.overdue}</span>}
                        <span className="text-yellow-400">{p.active} active</span>
                        <span className="text-green-400">{p.done} done</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected date detail */}
          <div className="rounded-xl bg-card border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">
              {selectedDate ? `📅 ${selectedDate}` : "เลือกวันในปฏิทิน"}
            </h3>
            {!selectedDate ? (
              <p className="text-xs text-muted">คลิกวันที่เพื่อดูงาน</p>
            ) : (() => {
              const dayJobs = jobsOnDate(selectedDate);
              const daySteps = stepsOnDate(selectedDate);
              return (dayJobs.length === 0 && daySteps.length === 0) ? (
                <p className="text-xs text-muted">ไม่มีงานวันนี้</p>
              ) : (
                <div className="space-y-2">
                  {dayJobs.length > 0 && (
                    <>
                      <p className="text-[10px] text-muted font-medium uppercase tracking-wide">📋 กำหนดส่งงาน</p>
                      {dayJobs.map(j => (
                        <Link key={j.id} href="/presale" className="block rounded-lg bg-background border border-border p-2.5 hover:border-accent transition-colors">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full ${statusColor[j.status]}`} />
                            <span className="text-[10px] font-medium" style={{ color: personColor(j.assigned_to) }}>{(j.assigned_to || "").split(" ")[0].replace(/[()]/g, "")}</span>
                            <span className={`rounded px-1 py-0.5 text-[8px] ${j.status === "completed" ? "bg-green-900/50 text-green-400" : j.status === "in_progress" ? "bg-yellow-900/50 text-yellow-400" : "bg-blue-900/50 text-blue-400"}`}>{statusLabel[j.status]}</span>
                          </div>
                          <p className="text-xs truncate">{typeLabels[j.type] || j.type}: {j.requirement?.slice(0, 40)}</p>
                          <p className="text-[10px] text-muted truncate">{j.customer_name} · {j.project_name}</p>
                        </Link>
                      ))}
                    </>
                  )}
                  {daySteps.length > 0 && (
                    <>
                      <p className="text-[10px] text-muted font-medium uppercase tracking-wide mt-2">🗓 แผนงาน</p>
                      {daySteps.map((e, i) => (
                        <Link key={i} href="/presale" className="block rounded-lg bg-purple-900/10 border border-purple-800/30 p-2.5 hover:border-purple-500/50 transition-colors">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-2 h-2 rounded-full ${STEP_STATUS_DOT[e.step.status]}`} />
                            <span className="text-base leading-none">{STEP_META[e.step.type].icon}</span>
                            <span className="text-[10px] font-medium text-purple-300">{e.step.label}</span>
                          </div>
                          <p className="text-[10px] text-muted truncate">{e.request.customer_name}{e.request.project_name ? ` · ${e.request.project_name}` : ""}</p>
                          <p className="text-[10px] text-muted">⏱ {e.step.duration_days} วัน{e.step.assignee ? ` · 👤 ${e.step.assignee}` : ""}</p>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
