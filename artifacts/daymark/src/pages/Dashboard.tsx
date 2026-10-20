import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Circle, Clock3, Code2, Flame, GraduationCap, Landmark, Pencil, Plus, Send, Target, Trash2, X } from 'lucide-react';
import UniversityApplications from '@/components/university-applications';
import type { UniversityApplication } from '@/lib/tracker-types';

type HabitId = 'code' | 'learn' | 'university-progress' | 'substack' | 'x-posts';
type HabitDay = { completedHabitIds: Array<HabitId | 'post'> };
type Milestone = { id: string; text: string; completed: boolean };
type Project = { id: string; name: string; milestones: Milestone[] };
type ArchivedVideoLog = { id: string; title: string; date: string; views: number; signups: number };
type Store = { startDate: string; days: Record<string, HabitDay>; projects: Project[]; applications: UniversityApplication[]; archivedVideoLogs: ArchivedVideoLog[] };

const HABITS: { id: HabitId; label: string; caption: string; icon: typeof Code2 }[] = [
  { id: 'code', label: 'Code', caption: 'Write some code', icon: Code2 },
  { id: 'learn', label: 'Learn', caption: 'Study something', icon: GraduationCap },
  { id: 'university-progress', label: 'University Progress', caption: 'Move an application forward', icon: Landmark },
  { id: 'substack', label: 'Substack', caption: 'Write or publish on Substack', icon: BookOpen },
  { id: 'x-posts', label: 'X Posts', caption: 'Share something on X', icon: Send },
];
const STORE_KEY = 'daymark-personal-tracker-v1';
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromKey = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const shiftKey = (key: string, amount: number) => { const date = fromKey(key); date.setDate(date.getDate() + amount); return todayKey(date); };
const shortDate = (key: string, options: Intl.DateTimeFormatOptions = { weekday: 'short' }) => fromKey(key).toLocaleDateString(undefined, options);
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const initialStore = (): Store => ({ startDate: todayKey(), days: {}, projects: [], applications: [], archivedVideoLogs: [] });
const readStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return initialStore();
    const parsed = JSON.parse(raw) as Partial<Store> & { videos?: ArchivedVideoLog[] };
    const { videos: legacyVideoLogs, ...saved } = parsed;
    return {
      ...initialStore(),
      ...saved,
      startDate: parsed.startDate || todayKey(),
      days: parsed.days || {},
      projects: parsed.projects || [],
      applications: parsed.applications || [],
      archivedVideoLogs: parsed.archivedVideoLogs || legacyVideoLogs || [],
    };
  } catch { return initialStore(); }
};

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="surface w-full max-w-md rounded-2xl p-5 shadow-2xl fade-up">
      <div className="mb-5 flex items-center justify-between"><h2 id="modal-title" className="text-lg font-bold">{title}</h2><button data-testid="button-close-modal" onClick={close} aria-label="Close dialog" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><X size={18}/></button></div>
      {children}
    </section>
  </div>;
}

export default function Dashboard() {
  const [store, setStore] = useState<Store>(readStore);
  const [today, setToday] = useState(todayKey());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [projectModal, setProjectModal] = useState<{ id?: string; name: string } | null>(null);
  const [milestoneModal, setMilestoneModal] = useState<{ projectId: string; id?: string; text: string } | null>(null);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }, [store]);
  useEffect(() => { const timer = window.setInterval(() => { setNow(Date.now()); const key = todayKey(); setToday(key); }, 1000); return () => window.clearInterval(timer); }, []);

  const cycleDay = Math.min(90, Math.max(1, Math.floor((fromKey(today).getTime() - fromKey(store.startDate).getTime()) / 86400000) + 1));
  const countCompletedHabits = (date: string) => {
    const completed = store.days[date]?.completedHabitIds || [];
    return HABITS.filter(({ id }) => completed.includes(id)).length;
  };
  const selectedDone = countCompletedHabits(selectedDate);
  const streak = useMemo(() => {
    let count = 0; let cursor = today;
    if (countCompletedHabits(cursor) < HABITS.length) cursor = shiftKey(cursor, -1);
    while (countCompletedHabits(cursor) === HABITS.length) { count++; cursor = shiftKey(cursor, -1); }
    return count;
  }, [store.days, today]);
  const nextJan = useMemo(() => {
    const t = new Date(now); let year = t.getFullYear();
    let jan = new Date(year, 0, 1);
    if (jan.getTime() <= now) jan = new Date(++year, 0, 1);
    return Math.max(0, jan.getTime() - now);
  }, [now]);
  const countdown = { days: Math.floor(nextJan / 86400000), hours: Math.floor((nextJan % 86400000) / 3600000), minutes: Math.floor((nextJan % 3600000) / 60000), seconds: Math.floor((nextJan % 60000) / 1000) };
  const monthLabel = fromKey(shiftKey(today, weekOffset * 7)).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekStart = (() => { const date = fromKey(today); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + weekOffset * 7); return todayKey(date); })();
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftKey(weekStart, i));
  const isFuture = selectedDate > today;

  const updateDay = (date: string, habit: HabitId) => setStore((prev) => {
    const done = prev.days[date]?.completedHabitIds || [];
    const completedHabitIds = done.includes(habit) ? done.filter((id) => id !== habit) : [...done, habit];
    return { ...prev, days: { ...prev.days, [date]: { completedHabitIds } } };
  });
  const saveProject = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!projectModal) return;
    const name = projectModal.name.trim(); if (!name) return;
    setStore((prev) => projectModal.id
      ? { ...prev, projects: prev.projects.map((p) => p.id === projectModal.id ? { ...p, name } : p) }
      : { ...prev, projects: [...prev.projects, { id: uid(), name, milestones: [] }] });
    setProjectModal(null);
  };
  const saveMilestone = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!milestoneModal) return;
    const text = milestoneModal.text.trim(); if (!text) return;
    setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id !== milestoneModal.projectId ? p : {
      ...p, milestones: milestoneModal.id
        ? p.milestones.map((m) => m.id === milestoneModal.id ? { ...m, text } : m)
        : [...p.milestones, { id: uid(), text, completed: false }],
    }) }));
    setMilestoneModal(null);
  };
  return <main className="app-shell min-h-[100dvh] px-4 pb-12 pt-5 sm:px-7 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-center justify-between border-b border-white/[.07] pb-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#8ac9a7]/15 text-[#8ac9a7]"><Target size={21}/></div>
          <div><div className="text-[15px] font-extrabold tracking-tight">Lily <span className="text-[#8ac9a7]">Progress</span></div><div className="text-[10px] uppercase tracking-[.22em] text-muted-foreground">your own momentum</div></div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-[#8ac9a7]"/><span data-testid="text-local-date">{fromKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
      </header>

      <section className="mb-7 grid gap-4 lg:grid-cols-[1.45fr_.85fr]">
        <div className="surface soft-grid relative overflow-hidden rounded-3xl p-5 sm:p-7">
          <div className="absolute -right-8 -top-12 size-48 rounded-full border border-[#8ac9a7]/10 sm:size-64"/><div className="absolute -right-1 top-0 size-36 rounded-full border border-[#8ac9a7]/10 sm:size-48"/>
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-[#8ac9a7]"><span className="size-1.5 rounded-full bg-[#8ac9a7]"/> The long game, one day at a time</div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <div className="text-[5.3rem] font-extrabold leading-[.84] tracking-[-.09em] sm:text-[7rem]" data-testid="text-cycle-day">{cycleDay}<span className="text-3xl font-medium tracking-normal text-muted-foreground sm:text-4xl">/90</span></div>
              <div className="pb-1 sm:pb-2"><div className="text-sm font-bold">Day of your cycle</div><div className="mt-1 text-xs text-muted-foreground">Small steps are still forward.</div></div>
            </div>
            <div className="mt-7 max-w-md">
              <div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>Cycle progress</span><span className="number">{cycleDay} of 90</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#8ac9a7] transition-[width] duration-700" style={{ width: `${cycleDay / 90 * 100}%` }}/></div>
            </div>
          </div>
          <div className="relative z-10 mt-7 flex items-center gap-2 border-t border-white/[.08] pt-4 text-xs text-muted-foreground"><span className="grid size-7 place-items-center rounded-lg bg-white/[.05]"><Clock3 size={14}/></span> This cycle began <span className="font-semibold text-foreground">{fromKey(store.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
        </div>
        <div className="surface relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">A little runway</div><h2 className="mt-2 text-lg font-bold">Until January 1</h2></div><div className="grid size-10 place-items-center rounded-xl bg-[#d9aa71]/10 text-[#d9aa71]"><Clock3 size={19}/></div></div>
          <div className="mt-7 grid grid-cols-4 gap-2">
            {([['days', countdown.days], ['hrs', countdown.hours], ['min', countdown.minutes], ['sec', countdown.seconds]] as [string, number][]).map(([label, value]) => <div key={label} className="rounded-xl bg-white/[.035] px-2 py-3 text-center"><div className="number text-2xl font-medium tracking-tight sm:text-3xl" data-testid={`value-countdown-${label}`}>{String(value).padStart(2, '0')}</div><div className="mt-1 text-[9px] uppercase tracking-[.18em] text-muted-foreground">{label}</div></div>)}
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><span className="text-[#d9aa71]"><Flame size={15}/></span><span data-testid="text-current-streak"><strong className="text-foreground">{streak} day{streak === 1 ? '' : 's'}</strong> in your current streak</span></div>
        </div>
      </section>

      <section className="mb-7">
        <div className="mb-3 flex items-end justify-between"><div><div className="text-[11px] font-bold uppercase tracking-[.18em] text-muted-foreground">{selectedDate === today ? 'Today' : `Habits for ${shortDate(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' })}`}, in {HABITS.length} small promises</div><h2 className="mt-1 text-xl font-bold">Show up for yourself.</h2></div><div className="number text-xs text-muted-foreground" data-testid="text-habit-completion">{selectedDone}/{HABITS.length} done</div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {HABITS.map(({ id, label, caption, icon: Icon }, i) => {
            const checked = (store.days[selectedDate]?.completedHabitIds || []).includes(id);
            return <button key={id} type="button" disabled={isFuture} onClick={() => updateDay(selectedDate, id)} data-testid={`button-habit-${id}`} aria-pressed={checked} className={`surface group flex min-h-[84px] items-center gap-4 rounded-2xl px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#8ac9a7]/40 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-[#8ac9a7]/45 bg-[#8ac9a7]/[.07]' : ''}`} style={{ animationDelay: `${i * 70}ms` }}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${checked ? 'bg-[#8ac9a7] text-[#17211c]' : 'bg-white/[.05] text-muted-foreground group-hover:text-[#8ac9a7]'}`}>{checked ? <Check className="check-pop" size={20}/> : <Icon size={19}/>}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{selectedDate === today ? caption : shortDate(selectedDate, { month: 'short', day: 'numeric' })}</span></span>
              <span className={`size-5 rounded-full border transition ${checked ? 'border-[#8ac9a7] bg-[#8ac9a7]' : 'border-white/20'}`}>{checked && <Check size={14} className="text-[#17211c]"/>}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="mb-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="surface rounded-3xl p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div><div className="text-[11px] font-bold uppercase tracking-[.18em] text-muted-foreground">The week at a glance</div><h2 className="mt-1 text-lg font-bold">{monthLabel}</h2></div>
            <div className="flex gap-1"><button onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week" data-testid="button-previous-week" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[.06] hover:text-foreground"><ChevronLeft size={18}/></button><button onClick={() => setWeekOffset((n) => Math.min(0, n + 1))} disabled={weekOffset >= 0} aria-label="Next week" data-testid="button-next-week" className="rounded-lg p-2 text-muted-foreground hover:bg-white/[.06] hover:text-foreground disabled:opacity-30"><ChevronRight size={18}/></button></div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((date) => {
              const done = countCompletedHabits(date);
              const future = date > today; const missed = date < today && done < HABITS.length;
              return <button key={date} type="button" disabled={future} onClick={() => { setSelectedDate(date); }} aria-pressed={selectedDate === date} data-testid={`button-calendar-day-${date}`} className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border px-1 py-2 transition hover:border-[#8ac9a7]/40 disabled:cursor-not-allowed disabled:opacity-40 ${selectedDate === date ? 'border-[#8ac9a7]/60 bg-[#8ac9a7]/10' : 'border-transparent bg-white/[.025]'}`}>
                <span className="text-[10px] text-muted-foreground">{shortDate(date)}</span>
                <span className={`number text-sm font-medium ${date === today ? 'text-[#8ac9a7]' : ''}`}>{fromKey(date).getDate()}</span>
                <span className={`size-1.5 rounded-full ${done === HABITS.length ? 'bg-[#8ac9a7]' : missed ? 'bg-[#d9aa71]/70' : future ? 'bg-transparent' : 'bg-white/15'}`}/>
              </button>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] pt-3">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-[#8ac9a7]"/> All habits</span><span className="inline-flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-[#d9aa71]/70"/> Missed / partial</span></div>
            <div className="text-[10px] text-muted-foreground">Select a past day to update it</div>
          </div>
        </div>
        <div className="surface rounded-3xl p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><div className="text-[11px] font-bold uppercase tracking-[.18em] text-muted-foreground">Keep the work visible</div><h2 className="mt-1 text-lg font-bold">Active projects</h2></div><button onClick={() => setProjectModal({ name: '' })} data-testid="button-add-project" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8ac9a7] px-3.5 text-xs font-bold text-[#17211c] transition hover:bg-[#a1d8b8]"><Plus size={15}/> New project</button></div>
          {store.projects.length === 0 ? <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 text-center"><span className="mb-2 grid size-9 place-items-center rounded-xl bg-white/[.04] text-muted-foreground"><Target size={17}/></span><div className="text-sm font-semibold">Make room for a big thing.</div><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Add a project, then break it into milestones you can actually finish.</p></div> :
            <div className="space-y-4">{store.projects.map((project) => {
              const completed = project.milestones.filter((m) => m.completed).length;
              return <article key={project.id} className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4" data-testid={`card-project-${project.id}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-bold" data-testid={`text-project-name-${project.id}`}>{project.name}</h3><div className="mt-1 text-[10px] text-muted-foreground" data-testid={`text-project-progress-${project.id}`}>{completed} / {project.milestones.length} milestones complete</div></div><div className="flex shrink-0 gap-1"><button aria-label={`Edit ${project.name}`} onClick={() => setProjectModal({ id: project.id, name: project.name })} data-testid={`button-edit-project-${project.id}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Pencil size={14}/></button><button aria-label={`Delete ${project.name}`} onClick={() => { if (window.confirm(`Delete “${project.name}” and its milestones?`)) setStore((p) => ({ ...p, projects: p.projects.filter((x) => x.id !== project.id) })); }} data-testid={`button-delete-project-${project.id}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-400/10 hover:text-red-300"><Trash2 size={14}/></button></div></div>
                {project.milestones.length > 0 && <div className="mt-3 space-y-1.5">{project.milestones.map((milestone) => <div key={milestone.id} className="group flex items-center gap-2 rounded-lg px-1 py-1">
                  <button aria-label={`${milestone.completed ? 'Mark incomplete' : 'Complete'} ${milestone.text}`} aria-pressed={milestone.completed} onClick={() => setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id !== project.id ? p : { ...p, milestones: p.milestones.map((m) => m.id === milestone.id ? { ...m, completed: !m.completed } : m) }) }))} data-testid={`button-toggle-milestone-${milestone.id}`} className={`grid size-5 shrink-0 place-items-center rounded-full border ${milestone.completed ? 'border-[#8ac9a7] bg-[#8ac9a7] text-[#17211c]' : 'border-white/20 text-transparent hover:border-[#8ac9a7]'}`}>{milestone.completed && <Check size={12}/>}</button>
                  <span className={`min-w-0 flex-1 text-xs ${milestone.completed ? 'text-muted-foreground line-through' : ''}`} data-testid={`text-milestone-${milestone.id}`}>{milestone.text}</span>
                  <button aria-label={`Edit milestone ${milestone.text}`} onClick={() => setMilestoneModal({ projectId: project.id, id: milestone.id, text: milestone.text })} data-testid={`button-edit-milestone-${milestone.id}`} className="rounded p-2 text-muted-foreground transition hover:text-foreground sm:p-1 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"><Pencil size={12}/></button>
                  <button aria-label={`Delete milestone ${milestone.text}`} onClick={() => setStore((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === project.id ? { ...p, milestones: p.milestones.filter((m) => m.id !== milestone.id) } : p) }))} data-testid={`button-delete-milestone-${milestone.id}`} className="rounded p-2 text-muted-foreground transition hover:text-red-300 sm:p-1 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"><X size={13}/></button>
                </div>)}</div>}
                <button onClick={() => setMilestoneModal({ projectId: project.id, text: '' })} data-testid={`button-add-milestone-${project.id}`} className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-[#8ac9a7] hover:bg-[#8ac9a7]/[.08]"><Plus size={13}/> Add milestone</button>
              </article>;
            })}</div>}
        </div>
      </section>

      <div className="mb-7">
        <UniversityApplications
          applications={store.applications}
          onChange={(update) => setStore((prev) => ({
            ...prev,
            applications: update(prev.applications),
          }))}
        />
      </div>

      <footer className="mt-7 flex flex-col items-center justify-between gap-2 text-[10px] text-muted-foreground sm:flex-row"><span>Private by design. Your progress stays on this device.</span><span className="inline-flex items-center gap-1.5"><Circle size={7} className="fill-[#8ac9a7] text-[#8ac9a7]"/> Saved locally</span></footer>
    </div>

    {projectModal && <Modal title={projectModal.id ? 'Edit project' : 'Start a project'} close={() => setProjectModal(null)}><form onSubmit={saveProject} className="space-y-4"><label className="block text-xs font-semibold text-muted-foreground">Project name<input autoFocus data-testid="input-project-name" value={projectModal.name} onChange={(e) => setProjectModal({ ...projectModal, name: e.target.value })} maxLength={90} placeholder="What are you building?" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-foreground placeholder:text-muted-foreground/60"/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setProjectModal(null)} data-testid="button-cancel-project" className="min-h-10 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:bg-white/[.05]">Cancel</button><button type="submit" data-testid="button-save-project" className="min-h-10 rounded-xl bg-[#8ac9a7] px-4 text-xs font-bold text-[#17211c]">{projectModal.id ? 'Save changes' : 'Create project'}</button></div></form></Modal>}
    {milestoneModal && <Modal title={milestoneModal.id ? 'Edit milestone' : 'Add a milestone'} close={() => setMilestoneModal(null)}><form onSubmit={saveMilestone} className="space-y-4"><label className="block text-xs font-semibold text-muted-foreground">A clear next step<input autoFocus data-testid="input-milestone-text" value={milestoneModal.text} onChange={(e) => setMilestoneModal({ ...milestoneModal, text: e.target.value })} maxLength={120} placeholder="Ship the first version" className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-foreground placeholder:text-muted-foreground/60"/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setMilestoneModal(null)} data-testid="button-cancel-milestone" className="min-h-10 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:bg-white/[.05]">Cancel</button><button type="submit" data-testid="button-save-milestone" className="min-h-10 rounded-xl bg-[#8ac9a7] px-4 text-xs font-bold text-[#17211c]">{milestoneModal.id ? 'Save changes' : 'Add milestone'}</button></div></form></Modal>}
  </main>;
}
