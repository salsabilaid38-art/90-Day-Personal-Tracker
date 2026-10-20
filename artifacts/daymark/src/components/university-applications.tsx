import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, ChevronDown, GraduationCap, Pencil, Plus, Trash2, X } from 'lucide-react';
import { APPLICATION_STATUSES, type UniversityApplication } from '@/lib/tracker-types';

type Props = {
  applications: UniversityApplication[];
  onChange: (update: (current: UniversityApplication[]) => UniversityApplication[]) => void;
};

type ApplicationDraft = {
  id?: string;
  name: string;
  deadline: string;
  status: UniversityApplication['status'];
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const fieldClass =
  'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/55';

const statusTone: Record<UniversityApplication['status'], string> = {
  Planning: 'border-white/10 bg-white/[.04] text-muted-foreground',
  'In progress': 'border-[#8ac9a7]/25 bg-[#8ac9a7]/[.08] text-[#8ac9a7]',
  Submitted: 'border-[#d9aa71]/25 bg-[#d9aa71]/[.08] text-[#d9aa71]',
  'Decision received': 'border-[#91b8d0]/25 bg-[#91b8d0]/[.08] text-[#91b8d0]',
};

function dateLabel(value: string) {
  if (!value) return 'No deadline set';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'No deadline set'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UniversityApplications({ applications, onChange }: Props) {
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({});
  const [editingSteps, setEditingSteps] = useState<Record<string, string>>({});
  const completedCount = applications.filter((application) => application.status === 'Submitted' || application.status === 'Decision received').length;

  const openNew = () => setDraft({ name: '', deadline: '', status: 'Planning' });
  const openEdit = (application: UniversityApplication) => setDraft({
    id: application.id,
    name: application.name,
    deadline: application.deadline,
    status: application.status,
  });

  const saveApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    if (draft.id) {
      onChange((current) => current.map((application) => application.id === draft.id
        ? { ...application, name, deadline: draft.deadline, status: draft.status }
        : application));
    } else {
      const application: UniversityApplication = {
        id: uid(),
        name,
        deadline: draft.deadline,
        status: draft.status,
        steps: [],
      };
      onChange((current) => [...current, application]);
    }
    setDraft(null);
  };

  const updateApplication = (id: string, update: Partial<UniversityApplication>) => {
    onChange((current) => current.map((application) => application.id === id ? { ...application, ...update } : application));
  };

  const addStep = (event: FormEvent<HTMLFormElement>, applicationId: string) => {
    event.preventDefault();
    const text = (stepDrafts[applicationId] || '').trim();
    if (!text) return;
    onChange((current) => current.map((application) => application.id !== applicationId ? application : {
      ...application,
      steps: [...application.steps, { id: uid(), text, completed: false }],
    }));
    setStepDrafts((current) => ({ ...current, [applicationId]: '' }));
  };

  const saveStep = (event: FormEvent<HTMLFormElement>, applicationId: string, stepId: string) => {
    event.preventDefault();
    const text = (editingSteps[stepId] || '').trim();
    if (!text) return;
    onChange((current) => current.map((application) => application.id !== applicationId ? application : {
      ...application,
      steps: application.steps.map((step) => step.id === stepId ? { ...step, text } : step),
    }));
    setEditingSteps((current) => {
      const next = { ...current };
      delete next[stepId];
      return next;
    });
  };

  return (
    <section className="surface overflow-hidden rounded-3xl" aria-labelledby="university-applications-title" data-testid="section-university-applications">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#91b8d0]/10 text-[#91b8d0]"><GraduationCap size={19} /></span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.18em] text-muted-foreground">The next chapter</div>
            <h2 id="university-applications-title" className="mt-1 text-lg font-bold">University applications</h2>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="text-[10px] text-muted-foreground" data-testid="text-application-summary">
            <span className="number text-sm text-foreground">{completedCount}</span> with a submission or decision
          </div>
          <button type="button" onClick={openNew} data-testid="button-add-application" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#8ac9a7] px-3.5 text-xs font-bold text-[#17211c] transition hover:bg-[#a1d8b8]">
            <Plus size={15} /> Add university
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center" data-testid="empty-university-applications">
          <span className="mb-3 grid size-11 place-items-center rounded-xl bg-white/[.04] text-muted-foreground"><GraduationCap size={19} /></span>
          <h3 className="text-sm font-semibold">Your next destination starts here.</h3>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Keep each application and its small next steps in one place. Add a university when you are ready.</p>
          <button type="button" onClick={openNew} data-testid="button-empty-add-application" className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#8ac9a7] hover:bg-[#8ac9a7]/[.08]">
            <Plus size={14} /> Add your first university
          </button>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {applications.map((application) => {
            const complete = application.steps.filter((step) => step.completed).length;
            return (
              <article key={application.id} className="rounded-2xl border border-white/[.07] bg-white/[.018] p-4 sm:p-5" data-testid={`card-application-${application.id}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold" data-testid={`text-application-name-${application.id}`}>{application.name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground" data-testid={`text-application-deadline-${application.id}`}>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-[#d9aa71]" /> Deadline</span>
                      <span className="number text-xs text-foreground/80">{dateLabel(application.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Edit ${application.name}`} onClick={() => openEdit(application)} data-testid={`button-edit-application-${application.id}`} className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground"><Pencil size={14} /></button>
                    <button type="button" aria-label={`Delete ${application.name}`} onClick={() => {
                      if (window.confirm(`Delete the ${application.name} application and its steps?`)) {
                        onChange((current) => current.filter((item) => item.id !== application.id));
                      }
                    }} data-testid={`button-delete-application-${application.id}`} className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-400/10 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                </div>

                <label className="relative mt-4 block">
                  <select
                    aria-label={`Application status for ${application.name}`}
                    value={application.status}
                    onChange={(event) => updateApplication(application.id, { status: event.target.value as UniversityApplication['status'] })}
                    data-testid={`select-application-status-${application.id}`}
                    className={`min-h-10 w-full appearance-none rounded-xl border px-3 text-xs font-semibold focus-visible:outline-offset-2 ${statusTone[application.status]}`}
                  >
                    {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </label>

                <div className="mt-5 border-t border-white/[.06] pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground">Next steps</h4>
                    <span className="number text-[10px] text-muted-foreground" data-testid={`text-step-progress-${application.id}`}>{complete}/{application.steps.length} complete</span>
                  </div>
                  {application.steps.length === 0 ? (
                    <p className="mb-3 rounded-lg bg-white/[.025] px-3 py-2.5 text-xs text-muted-foreground" data-testid={`empty-application-steps-${application.id}`}>No steps yet. Add one small action to get started.</p>
                  ) : (
                    <ul className="mb-3 space-y-1">
                      {application.steps.map((step) => (
                        <li key={step.id} className="group flex min-h-10 items-center gap-2 rounded-lg px-1" data-testid={`row-application-step-${step.id}`}>
                          <button
                            type="button"
                            aria-label={`${step.completed ? 'Mark incomplete' : 'Complete'} ${step.text}`}
                            aria-pressed={step.completed}
                            onClick={() => onChange((current) => current.map((item) => item.id !== application.id ? item : {
                              ...item,
                              steps: item.steps.map((entry) => entry.id === step.id ? { ...entry, completed: !entry.completed } : entry),
                            }))}
                            data-testid={`button-toggle-application-step-${step.id}`}
                            className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${step.completed ? 'border-[#8ac9a7] bg-[#8ac9a7] text-[#17211c]' : 'border-white/20 text-transparent hover:border-[#8ac9a7]'}`}
                          >{step.completed && <Check size={12} />}</button>
                          {editingSteps[step.id] !== undefined ? (
                            <form onSubmit={(event) => saveStep(event, application.id, step.id)} className="flex min-w-0 flex-1 items-center gap-1.5">
                              <input autoFocus aria-label={`Edit step ${step.text}`} data-testid={`input-edit-application-step-${step.id}`} value={editingSteps[step.id]} onChange={(event) => setEditingSteps((current) => ({ ...current, [step.id]: event.target.value }))} maxLength={120} className="min-h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs text-foreground" />
                              <button type="submit" aria-label={`Save step ${step.text}`} data-testid={`button-save-application-step-${step.id}`} className="rounded-md p-2 text-[#8ac9a7] hover:bg-white/[.06]"><Check size={14} /></button>
                              <button type="button" aria-label={`Cancel editing step ${step.text}`} onClick={() => setEditingSteps((current) => { const next = { ...current }; delete next[step.id]; return next; })} data-testid={`button-cancel-edit-application-step-${step.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-white/[.06]"><X size={14} /></button>
                            </form>
                          ) : (
                            <>
                              <span className={`min-w-0 flex-1 break-words text-xs ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground/85'}`} data-testid={`text-application-step-${step.id}`}>{step.text}</span>
                              <button type="button" aria-label={`Edit step ${step.text}`} onClick={() => setEditingSteps((current) => ({ ...current, [step.id]: step.text }))} data-testid={`button-edit-application-step-${step.id}`} className="rounded-md p-2 text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><Pencil size={12} /></button>
                              <button type="button" aria-label={`Delete step ${step.text}`} onClick={() => onChange((current) => current.map((item) => item.id !== application.id ? item : { ...item, steps: item.steps.filter((entry) => entry.id !== step.id) }))} data-testid={`button-delete-application-step-${step.id}`} className="rounded-md p-2 text-muted-foreground transition hover:bg-red-400/10 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><X size={13} /></button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={(event) => addStep(event, application.id)} className="flex gap-2">
                    <label className="sr-only" htmlFor={`input-add-application-step-${application.id}`}>Add a step for {application.name}</label>
                    <input id={`input-add-application-step-${application.id}`} value={stepDrafts[application.id] || ''} onChange={(event) => setStepDrafts((current) => ({ ...current, [application.id]: event.target.value }))} data-testid={`input-add-application-step-${application.id}`} maxLength={120} placeholder="Add a next step…" className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/[.08] bg-black/15 px-3 text-xs text-foreground placeholder:text-muted-foreground/55" />
                    <button type="submit" disabled={!(stepDrafts[application.id] || '').trim()} data-testid={`button-add-application-step-${application.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-[#8ac9a7] transition hover:bg-[#8ac9a7]/[.08] disabled:cursor-not-allowed disabled:opacity-40"><Plus size={14} /><span className="hidden sm:inline">Add step</span></button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="application-dialog-title" className="surface fade-up w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 id="application-dialog-title" className="text-lg font-bold">{draft.id ? 'Edit application' : 'Add a university'}</h3>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close application dialog" data-testid="button-close-application-dialog" className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><X size={18} /></button>
            </div>
            <form onSubmit={saveApplication} className="space-y-4">
              <label className="block text-xs font-semibold text-muted-foreground">University name
                <input autoFocus required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} data-testid="input-application-name" maxLength={100} placeholder="e.g. University of Edinburgh" className={fieldClass} />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">Application deadline
                <input type="date" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} data-testid="input-application-deadline" className={fieldClass} />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">Status
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as UniversityApplication['status'] })} data-testid="select-application-dialog-status" className={fieldClass}>
                  {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setDraft(null)} data-testid="button-cancel-application" className="min-h-10 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:bg-white/[.05]">Cancel</button>
                <button type="submit" data-testid="button-save-application" className="min-h-10 rounded-xl bg-[#8ac9a7] px-4 text-xs font-bold text-[#17211c]">{draft.id ? 'Save changes' : 'Create application'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
