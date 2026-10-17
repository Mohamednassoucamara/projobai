import { useEffect, useState } from "react";
import { Mail, Phone, FileText, Loader2 } from "lucide-react";
import { storageService, companyService } from "../../services/supabase.service";
import type { Database } from "../../types/database.types";

type Application = Database["public"]["Tables"]["applications"]["Row"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-200 text-slate-700",
  reviewed: "bg-[#050FA0]/10 text-[#050FA0]",
  shortlisted: "bg-amber-100 text-amber-800",
  interview: "bg-violet-100 text-violet-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

/** Actions proposées au recruteur ; le candidat est notifié à chaque changement. */
const ACTIONS: { status: Application["status"]; label: string }[] = [
  { status: "reviewed", label: "Marquer comme examinée" },
  { status: "shortlisted", label: "Présélectionner" },
  { status: "interview", label: "Inviter en entretien" },
  { status: "accepted", label: "Retenir" },
  { status: "rejected", label: "Refuser" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  reviewed: "Examinée",
  shortlisted: "Présélectionnée",
  interview: "Entretien",
  accepted: "Acceptée",
  rejected: "Refusée",
};

type ApplicantProfile = {
  full_name?: string;
  email?: string;
  phone?: string;
};

export type CompanyApplicationData = {
  id: string;
  status: string;
  applied_at: string;
  job_id?: string;
  motivation_message?: string | null;
  cv_url?: string | null;
  cover_letter?: string | null;
  jobs?: { title?: string };
  candidate_profiles?: {
    job_title?: string | null;
    location?: string | null;
    profiles?: ApplicantProfile;
  };
};

function DocumentLink({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (path.startsWith("http")) {
          if (!cancelled) setUrl(path);
          return;
        }
        const bucket = path.split("/").length >= 3 ? "application-documents" : "cvs";
        const signed = await storageService.getSignedDocumentUrl(bucket, path);
        if (!cancelled) setUrl(signed);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [path]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        {label}…
      </span>
    );
  }

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#050FA0] hover:underline"
    >
      <FileText className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default function CompanyApplicationItem({
  app,
  onStatusChange,
}: {
  app: CompanyApplicationData;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => setStatus(app.status), [app.status]);

  const changeStatus = async (next: Application["status"]) => {
    if (next === "rejected" && !confirmReject) {
      setConfirmReject(true);
      window.setTimeout(() => setConfirmReject(false), 4000);
      return;
    }
    setConfirmReject(false);
    setBusy(next);
    setError(null);
    const previous = status;
    setStatus(next);
    try {
      await companyService.updateApplicationStatus(app.id, next);
      onStatusChange?.(app.id, next);
    } catch {
      setStatus(previous);
      setError("Le statut n'a pas pu être modifié. Réessayez.");
    } finally {
      setBusy(null);
    }
  };

  const profile = app.candidate_profiles?.profiles;
  const candidateMeta = app.candidate_profiles;
  const offerTitle = app.jobs?.title;

  return (
    <li className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {offerTitle && (
            <p className="text-xs font-semibold text-[#050FA0] uppercase tracking-wide mb-1">
              {offerTitle}
            </p>
          )}
          <p className="font-semibold text-slate-800">{profile?.full_name || "Candidat"}</p>
          {candidateMeta?.job_title && (
            <p className="text-sm text-slate-600 mt-0.5">{candidateMeta.job_title}</p>
          )}
          {candidateMeta?.location && (
            <p className="text-xs text-slate-500">{candidateMeta.location}</p>
          )}
          {profile?.email && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-2">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <a href={`mailto:${profile.email}`} className="hover:text-[#050FA0]">{profile.email}</a>
            </p>
          )}
          {profile?.phone && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${profile.phone}`} className="hover:text-[#050FA0]">{profile.phone}</a>
            </p>
          )}
          {app.motivation_message && (
            <p className="text-sm text-slate-700 mt-3 p-3 rounded-lg bg-white border border-slate-100 italic">
              « {app.motivation_message} »
            </p>
          )}
          <div className="flex flex-wrap gap-4 mt-3">
            {app.cv_url && <DocumentLink path={app.cv_url} label="Voir le CV" />}
            {app.cover_letter && <DocumentLink path={app.cover_letter} label="Lettre de motivation" />}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Postulé le {new Date(app.applied_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.reviewed}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200">
        {ACTIONS.filter((a) => a.status !== status && (a.status !== "reviewed" || status === "pending")).map((a) => (
          <button
            key={a.status}
            type="button"
            disabled={busy !== null}
            onClick={() => changeStatus(a.status)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
              a.status === "rejected"
                ? confirmReject
                  ? "bg-red-600 border-red-600 text-white"
                  : "border-red-200 text-red-700 hover:bg-red-50"
                : "border-slate-300 text-slate-700 hover:border-[#050FA0] hover:text-[#050FA0] bg-white"
            }`}
          >
            {busy === a.status && <Loader2 className="h-3 w-3 animate-spin" />}
            {a.status === "rejected" && confirmReject ? "Confirmer le refus" : a.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </li>
  );
}
