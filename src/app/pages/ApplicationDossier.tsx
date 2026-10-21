import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  Loader2, Mail, Phone, MessageCircle, CalendarPlus, CalendarDays, Video, MapPin, Clock, Ban, CheckCircle2,
  Pencil, History, Send, Trash2, AlertCircle, Briefcase, GraduationCap, Download,
} from "lucide-react";
import AppNavHeader from "../components/AppNavHeader";
import Footer from "../components/Footer";
import MatchExplanation from "../components/MatchExplanation";
import { PremiumUpsell } from "../components/PremiumGate";
import { usePlan } from "../contexts/PlanContext";
import InterviewForm, { type InterviewDraft } from "../components/InterviewForm";
import InterviewEvaluationForm from "../components/InterviewEvaluationForm";
import { DocumentLink } from "../components/CompanyApplicationItem";
import { matchJob } from "../../lib/matching";
import {
  PIPELINE, STATUS_LABELS, STATUS_STYLES, STAGE_RANK, SOURCES, MODE_LABELS, formatWhen, downloadIcs, googleCalendarLink,
  whatsappNumber, type AppStatus, type Interview,
} from "../../lib/ats";
import { atsService, atsErrorMessage, type ApplicationEvent } from "../../services/ats.service";
import { companyService } from "../../services/supabase.service";

type CV = {
  jobTitle?: string;
  location?: string;
  profile?: string;
  skills?: string[];
  experiences?: { title?: string; company?: string; period?: string; description?: string[] }[];
  education?: { degree?: string; institution?: string; period?: string }[];
  languages?: { name?: string; level?: string }[];
};

type AppRow = {
  id: string;
  status: AppStatus;
  applied_at: string;
  source?: string | null;
  cv_url?: string | null;
  cover_letter?: string | null;
  motivation_message?: string | null;
  jobs?: Record<string, unknown> & { id: string; title: string; location?: string; job_skills?: { skill_name: string }[] };
  candidate_profiles?: { job_title?: string | null; location?: string | null; profiles?: { full_name?: string; email?: string; phone?: string } };
};

const MODE_ICON = { visio: Video, presentiel: MapPin, telephone: Phone } as const;

export default function ApplicationDossier() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const [app, setApp] = useState<AppRow | null>(null);
  const [cv, setCv] = useState<CV | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [atsReady, setAtsReady] = useState(true);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { can } = usePlan();

  const flash = (ok: boolean, text: string) => {
    setNotice({ ok, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = (await atsService.getApplication(id)) as AppRow | null;
        if (cancelled) return;
        if (!row) { setError("Candidature introuvable."); return; }
        setApp(row);
        const results = await Promise.allSettled([atsService.getApplicantCVs(), atsService.getEvents(id), atsService.interviewsForApplication(id)]);
        if (cancelled) return;
        if (results[0].status === "fulfilled") setCv((results[0].value[id] as CV) || null);
        if (results[1].status === "fulfilled") setEvents(results[1].value);
        if (results[2].status === "fulfilled") setInterviews(results[2].value);
        // Fonction Premium non incluse ≠ migration manquante
        if (results.some((r) => r.status === "rejected" && !/PREMIUM_REQUIRED/.test(String((r.reason as { message?: string })?.message || r.reason)))) setAtsReady(false);
      } catch {
        if (!cancelled) setError("Le dossier n'a pas pu être chargé. Vérifiez votre connexion.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Ouvrir directement la planification depuis « Planifier un entretien ».
  useEffect(() => {
    if (!loading && location.hash === "#entretien") {
      if (!interviews.some((i) => i.status === "planned")) setPlanning(true);
      document.getElementById("entretien")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loading, location.hash, interviews]);

  const match = useMemo(() => (app?.jobs && cv && (cv.skills?.length || cv.jobTitle) ? matchJob(app.jobs as Parameters<typeof matchJob>[0], cv) : null), [app, cv]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-[#050FA0]" /></div>;
  }
  if (error || !app) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AppNavHeader backTo="/company/dashboard" backLabel="Retour au tableau de bord" />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <AlertCircle className="h-12 w-12 text-[#E4220F] mx-auto mb-3" />
            <p className="font-semibold text-slate-800">{error || "Candidature introuvable."}</p>
          </div>
        </div>
      </div>
    );
  }

  const person = app.candidate_profiles?.profiles || {};
  const name = person.full_name || "Candidat";
  const jobTitle = app.jobs?.title || "Offre";
  const wa = whatsappNumber(person.phone);
  const reloadEvents = () => atsService.getEvents(id).then(setEvents, () => undefined);

  const changeStatus = async (next: AppStatus) => {
    if (next === app.status) return;
    if (next === "rejected" && !window.confirm(`Marquer la candidature de ${name} comme non retenue ? Le candidat sera prévenu.`)) return;
    setBusy("status");
    try {
      await companyService.updateApplicationStatus(app.id, next);
      setApp({ ...app, status: next });
      flash(true, `Étape mise à jour : ${STATUS_LABELS[next]}. Le candidat est prévenu.`);
      reloadEvents();
    } catch {
      flash(false, "L'étape n'a pas pu être modifiée. Réessayez.");
    } finally {
      setBusy(null);
    }
  };

  const createInterview = async (draft: InterviewDraft) => {
    try {
      const iv = await atsService.createInterview({ ...draft, application_id: app.id, candidate_id: (app as unknown as { candidate_id: string }).candidate_id });
      setInterviews((l) => [...l, iv].sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)));
      setPlanning(false);
      if (STAGE_RANK[app.status] < STAGE_RANK.interview && app.status !== "rejected") setApp({ ...app, status: "interview" });
      flash(true, `Entretien planifié le ${formatWhen(iv.scheduled_at)}. ${name} reçoit la convocation.`);
      reloadEvents();
    } catch (err) {
      throw new Error(atsErrorMessage(err));
    }
  };

  const updateInterview = async (ivId: string, patch: Partial<Interview>, okText: string) => {
    setBusy(ivId);
    try {
      const iv = await atsService.updateInterview(ivId, patch);
      setInterviews((l) => l.map((x) => (x.id === ivId ? iv : x)));
      setEditing(null);
      flash(true, okText);
      reloadEvents();
    } catch (err) {
      flash(false, atsErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text) return;
    setBusy("comment");
    try {
      const ev = await atsService.addComment(app.id, text);
      setEvents((l) => [...l, ev]);
      setComment("");
    } catch (err) {
      flash(false, atsErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const removeComment = async (evId: string) => {
    try {
      await atsService.deleteComment(evId);
      setEvents((l) => l.filter((x) => x.id !== evId));
    } catch (err) {
      flash(false, atsErrorMessage(err));
    }
  };

  const currentRank = STAGE_RANK[app.status] ?? 0;
  const calendarText = (iv: Interview) => `Entretien ${name} — ${jobTitle}`;
  const calendarDesc = (iv: Interview) =>
    [`Candidat : ${name}`, person.phone ? `Téléphone : ${person.phone}` : "", iv.meeting_url ? `Lien : ${iv.meeting_url}` : "", iv.message || ""].filter(Boolean).join("\n");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavHeader backTo="/company/dashboard" backLabel="Retour aux candidatures" />

      <main className="page-container py-8 sm:py-10 flex-1">
        {notice && (
          <div role="status" className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium border-2 ${notice.ok ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>
            {notice.text}
          </div>
        )}
        {!atsReady && (
          <p className="mb-6 rounded-xl px-4 py-3 text-sm border-2 bg-amber-50 border-amber-200 text-amber-900">
            Les entretiens, commentaires et scores ne sont pas encore activés : appliquez la migration 011 dans Supabase (SQL Editor).
          </p>
        )}

        {/* En-tête du dossier */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border p-5 sm:p-8 mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-[#050FA0]">{jobTitle}</p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{name}</h1>
              <p className="text-slate-600 mt-1">
                {[cv?.jobTitle || app.candidate_profiles?.job_title, cv?.location || app.candidate_profiles?.location].filter(Boolean).join(" · ") || "Profil non renseigné"}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Postulé le {new Date(app.applied_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                {app.source ? ` · via ${SOURCES[app.source] || app.source}` : ""}
              </p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLES[app.status]}`}>{STATUS_LABELS[app.status]}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {person.email && (
              <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                <Mail className="h-4 w-4" /> {person.email}
              </a>
            )}
            {person.phone && (
              <a href={`tel:${person.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0]">
                <Phone className="h-4 w-4" /> {person.phone}
              </a>
            )}
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-bold hover:bg-[#1EBE5A]">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-5">
            {app.cv_url && <DocumentLink path={app.cv_url} label="CV envoyé" />}
            {app.cover_letter && <DocumentLink path={app.cover_letter} label="Lettre de motivation" />}
          </div>
          {app.motivation_message && (
            <p className="mt-4 text-sm text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-100 italic">« {app.motivation_message} »</p>
          )}

          {/* Étapes */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Étape du recrutement</h2>
            <ol className="flex flex-wrap gap-2" aria-label="Étapes">
              {PIPELINE.map((st) => {
                const reached = app.status !== "rejected" && STAGE_RANK[st.status] <= currentRank;
                const current = app.status === st.status;
                return (
                  <li key={st.status}>
                    <button
                      type="button"
                      disabled={busy === "status" || current}
                      onClick={() => changeStatus(st.status)}
                      aria-current={current ? "step" : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-colors disabled:cursor-default ${
                        current ? "bg-[#050FA0] border-[#050FA0] text-white" : reached ? "border-[#050FA0]/40 text-[#050FA0] bg-[#050FA0]/5 hover:border-[#050FA0]" : "border-slate-200 text-slate-600 hover:border-[#050FA0]"
                      }`}
                    >
                      {reached && !current && <CheckCircle2 className="h-4 w-4" />}
                      {st.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  disabled={busy === "status" || app.status === "rejected"}
                  onClick={() => changeStatus("rejected")}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 ${app.status === "rejected" ? "bg-red-600 border-red-600 text-white" : "border-red-200 text-red-700 hover:bg-red-50"}`}
                >
                  <Ban className="h-4 w-4" /> Non retenue
                </button>
              </li>
            </ol>
            <p className="mt-2 text-xs text-slate-500">Chaque changement d&apos;étape est notifié au candidat (sur la plateforme, et par e-mail ou WhatsApp s&apos;il l&apos;a accepté).</p>
          </div>
        </section>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Entretiens */}
            <section id="entretien" className="bg-white rounded-2xl sm:rounded-3xl border p-5 sm:p-8 scroll-mt-24">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-700" /> Entretiens</h2>
                {!planning && atsReady && can("interviews") && (
                  <button type="button" onClick={() => setPlanning(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 text-white text-sm font-bold hover:bg-violet-800">
                    <CalendarPlus className="h-4 w-4" /> Planifier un entretien
                  </button>
                )}
              </div>

              {!can("interviews") ? (
                <PremiumUpsell feature="interviews" compact description="planifiez la visio ou le rendez-vous, le candidat est convoqué et rappelé automatiquement" />
              ) : (<>
              {planning && (
                <div className="mb-6 rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4 sm:p-5">
                  <h3 className="font-bold mb-3">Nouvel entretien avec {name}</h3>
                  <InterviewForm onSubmit={createInterview} onCancel={() => setPlanning(false)} submitLabel="Planifier et convoquer" defaultLocation={(app.jobs?.location as string) || ""} />
                </div>
              )}

              {interviews.length === 0 && !planning && (
                <p className="text-sm text-slate-500 rounded-xl bg-slate-50 border border-dashed border-slate-200 p-5 text-center">Aucun entretien planifié pour cette candidature.</p>
              )}

              <ul className="space-y-4">
                {interviews.map((iv) => {
                  const Icon = MODE_ICON[iv.mode];
                  const past = new Date(iv.scheduled_at).getTime() < Date.now();
                  return (
                    <li key={iv.id} className={`rounded-2xl border-2 p-4 ${iv.status === "cancelled" ? "border-slate-200 bg-slate-50 opacity-75" : "border-violet-200"}`}>
                      {editing === iv.id ? (
                        <InterviewForm
                          initial={iv}
                          submitLabel="Enregistrer et prévenir le candidat"
                          onCancel={() => setEditing(null)}
                          onSubmit={(d) => updateInterview(iv.id, d, "Entretien modifié. Le candidat est prévenu.")}
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-2">
                                <Icon className="h-4 w-4 text-violet-700" /> {formatWhen(iv.scheduled_at)}
                              </p>
                              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" /> {iv.duration_minutes} min · {MODE_LABELS[iv.mode]}
                                {iv.interviewer ? ` · ${iv.interviewer}` : ""}
                              </p>
                              {iv.mode === "presentiel" && iv.location && <p className="text-sm text-slate-700 mt-1">{iv.location}</p>}
                              {iv.meeting_url && (
                                <a href={iv.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#050FA0] hover:underline break-all">{iv.meeting_url}</a>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${iv.status === "cancelled" ? "bg-slate-200 text-slate-600" : iv.status === "done" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>
                              {iv.status === "cancelled" ? "Annulé" : iv.status === "done" ? "Réalisé" : past ? "À évaluer" : "Planifié"}
                            </span>
                          </div>

                          {iv.status !== "cancelled" && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => setEvaluating(evaluating === iv.id ? null : iv.id)} aria-expanded={evaluating === iv.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#050FA0] text-white text-xs font-bold hover:bg-[#060C6E]">
                                Évaluation et compte rendu
                              </button>
                              {iv.status === "planned" && (
                                <>
                                  <button type="button" onClick={() => setEditing(iv.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#050FA0]">
                                    <Pencil className="h-3.5 w-3.5" /> Modifier
                                  </button>
                                  <button type="button" onClick={() => downloadIcs(iv, calendarText(iv), calendarDesc(iv))} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#050FA0]">
                                    <Download className="h-3.5 w-3.5" /> Agenda (.ics)
                                  </button>
                                  <a href={googleCalendarLink(iv, calendarText(iv), calendarDesc(iv))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#050FA0]">
                                    Google Agenda
                                  </a>
                                  {past && (
                                    <button type="button" disabled={busy === iv.id} onClick={() => updateInterview(iv.id, { status: "done" }, "Entretien marqué comme réalisé.")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Réalisé
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={busy === iv.id}
                                    onClick={() => window.confirm("Annuler cet entretien ? Le candidat sera prévenu.") && updateInterview(iv.id, { status: "cancelled" }, "Entretien annulé. Le candidat est prévenu.")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50"
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Annuler
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {evaluating === iv.id && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <InterviewEvaluationForm interview={iv} candidateName={name} jobTitle={jobTitle} />
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              </>)}
            </section>

            {/* Historique et commentaires */}
            <section className="bg-white rounded-2xl sm:rounded-3xl border p-5 sm:p-8">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-1"><History className="h-5 w-5 text-[#050FA0]" /> Historique et commentaires</h2>
              <p className="text-sm text-slate-500 mb-5">Les commentaires restent internes à votre entreprise.</p>
              {!can("ats_history") ? (
                <PremiumUpsell feature="ats_history" compact description="gardez la trace de chaque étape et partagez vos notes sur le candidat" />
              ) : (<>

              <form onSubmit={addComment} className="mb-6">
                <label htmlFor="comment" className="sr-only">Ajouter un commentaire</label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Ex. : Appel le 12/11, disponible immédiatement, prétentions 6 M GNF…"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 focus:border-[#050FA0] outline-none text-sm"
                  disabled={!atsReady}
                />
                <button type="submit" disabled={!comment.trim() || busy === "comment" || !atsReady} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#060C6E] disabled:opacity-50">
                  {busy === "comment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ajouter le commentaire
                </button>
              </form>

              {events.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
              ) : (
                <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
                  {[...events].reverse().map((ev) => (
                    <li key={ev.id} className="ml-5">
                      <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${ev.kind === "comment" ? "bg-amber-500" : ev.kind === "interview" ? "bg-violet-600" : "bg-[#050FA0]"}`} aria-hidden="true" />
                      <p className="text-xs text-slate-500">
                        {new Date(ev.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {ev.kind === "status" && (
                        <p className="text-sm text-slate-800">
                          {ev.from_status ? <>Étape : <s className="text-slate-400">{STATUS_LABELS[ev.from_status] || ev.from_status}</s> → </> : null}
                          <span className="font-semibold">{ev.from_status ? STATUS_LABELS[ev.to_status || ""] : "Candidature reçue"}</span>
                        </p>
                      )}
                      {ev.kind === "interview" && <p className="text-sm text-slate-800">{ev.comment}</p>}
                      {ev.kind === "comment" && (
                        <div className="mt-1 rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-slate-800 whitespace-pre-line">
                          {ev.comment}
                          <button type="button" onClick={() => removeComment(ev.id)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-700">
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              </>)}
            </section>
          </div>

          <aside className="lg:col-span-2 space-y-6">
            {!can("ai_ranking") ? (
              <PremiumUpsell feature="ai_ranking" compact description="l'IA lit le CV du candidat, calcule son score et l'explique critère par critère" />
            ) : (<>
            {match ? (
              <MatchExplanation match={match} audience="company" />
            ) : (
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-sm text-slate-600">
                Score de compatibilité indisponible : ce candidat n&apos;a pas rempli son CV sur ProJob AI. Consultez le CV envoyé.
              </div>
            )}

            {cv && (
              <section className="bg-white rounded-2xl border p-5">
                <h2 className="font-bold text-lg mb-3">CV du candidat</h2>
                {cv.profile && <p className="text-sm text-slate-700 mb-4">{cv.profile}</p>}
                {(cv.experiences || []).length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2"><Briefcase className="h-4 w-4" /> Expériences</h3>
                    <ul className="space-y-2 mb-4">
                      {cv.experiences!.map((e, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-semibold text-slate-900">{e.title}</span>
                          {e.company ? <span className="text-slate-600"> — {e.company}</span> : null}
                          {e.period ? <span className="block text-xs text-slate-500">{e.period}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {(cv.education || []).length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2"><GraduationCap className="h-4 w-4" /> Formation</h3>
                    <ul className="space-y-2 mb-4">
                      {cv.education!.map((e, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-semibold text-slate-900">{e.degree}</span>
                          {e.institution ? <span className="text-slate-600"> — {e.institution}</span> : null}
                          {e.period ? <span className="block text-xs text-slate-500">{e.period}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {(cv.skills || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills!.map((s) => <span key={s} className="px-2.5 py-1 rounded-full bg-[#050FA0]/10 text-[#050FA0] text-xs font-semibold">{s}</span>)}
                  </div>
                )}
                {(cv.languages || []).length > 0 && (
                  <p className="mt-3 text-xs text-slate-600">Langues : {cv.languages!.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ")}</p>
                )}
              </section>
            )}
            </>)}

            <Link to="/company/interviews" className="flex items-center gap-2 text-sm font-bold text-[#050FA0] hover:underline">
              <CalendarDays className="h-4 w-4" /> Voir l&apos;agenda de tous les entretiens
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
