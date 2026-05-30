import { Link } from "react-router";
import { Building2, MapPin, Calendar, ArrowRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  reviewed: "Examinée",
  shortlisted: "Présélectionnée",
  interview: "Entretien",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  reviewed: "bg-blue-100 text-blue-800",
  shortlisted: "bg-indigo-100 text-indigo-800",
  interview: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export type CandidateApplicationData = {
  id: string;
  status: string;
  applied_at: string;
  jobs?: {
    id: string;
    title: string;
    location?: string | null;
    job_type?: string | null;
    company_profiles?: {
      company_name?: string;
      logo_url?: string | null;
    };
  };
};

export default function CandidateApplicationItem({ app }: { app: CandidateApplicationData }) {
  const job = app.jobs;
  const company = job?.company_profiles?.company_name || "Entreprise";
  const statusStyle = STATUS_STYLES[app.status] || "bg-slate-100 text-slate-700";

  return (
    <li className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#003087]/30 hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            to={`/jobs/${job?.id}`}
            className="text-lg font-bold text-slate-800 hover:text-[#003087] transition-colors line-clamp-2"
          >
            {job?.title || "Offre d'emploi"}
          </Link>
          <p className="text-slate-600 flex items-center gap-1.5 mt-1.5">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            {company}
          </p>
          {job?.location && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {job.location}
            </p>
          )}
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Postulé le{" "}
            {new Date(app.applied_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle}`}>
            {STATUS_LABELS[app.status] || app.status}
          </span>
          {job?.id && (
            <Link
              to={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#003087] hover:underline"
            >
              Voir l'offre
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          {!job?.id && (
            <span className="text-xs text-slate-500 italic">Offre non disponible</span>
          )}
        </div>
      </div>
    </li>
  );
}
