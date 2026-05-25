import { useEffect, useState } from "react";
import { Mail, Phone, FileText, Loader2 } from "lucide-react";
import { storageService } from "../../services/supabase.service";

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
  motivation_message?: string | null;
  cv_url?: string | null;
  cover_letter?: string | null;
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
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#003087] hover:underline"
    >
      <FileText className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default function CompanyApplicationItem({ app }: { app: CompanyApplicationData }) {
  const profile = app.candidate_profiles?.profiles;
  const candidateMeta = app.candidate_profiles;

  return (
    <li className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
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
              <a href={`mailto:${profile.email}`} className="hover:text-[#003087]">{profile.email}</a>
            </p>
          )}
          {profile?.phone && (
            <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${profile.phone}`} className="hover:text-[#003087]">{profile.phone}</a>
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
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#003087]/10 text-[#003087] shrink-0">
          {STATUS_LABELS[app.status] || app.status}
        </span>
      </div>
    </li>
  );
}
