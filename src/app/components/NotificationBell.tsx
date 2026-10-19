import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Loader2, Settings2, Mail, MessageCircle, X, CalendarDays, ClipboardList, Info } from "lucide-react";
import { atsService, type NotificationRow } from "../../services/ats.service";

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `il y a ${d} j` : new Date(iso).toLocaleDateString("fr-FR");
}

const ICONS: Record<string, typeof Bell> = { interview: CalendarDays, application: ClipboardList };

/** Cloche de notifications + réglages e-mail / WhatsApp. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"list" | "settings">("list");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<{ phone: string; notify_email: boolean; notify_whatsapp: boolean } | null>(null);
  const [prefsError, setPrefsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = () =>
    atsService.notifications().then(setItems, () => setItems([])).finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => {
    if (tab !== "settings" || prefs) return;
    atsService.getNotifyPrefs().then(
      (p) => setPrefs({ phone: p?.phone || "", notify_email: p?.notify_email ?? true, notify_whatsapp: p?.notify_whatsapp ?? false }),
      () => setPrefsError("Les réglages de notification demandent la migration 011 dans Supabase."),
    );
  }, [tab, prefs]);

  const unread = items.filter((n) => !n.is_read);

  const openItem = async (n: NotificationRow) => {
    if (!n.is_read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      atsService.markRead([n.id]).catch(() => undefined);
    }
    setOpen(false);
    if (n.link) {
      const [path, hash] = n.link.split("#");
      navigate({ pathname: path || "/", hash: hash ? `#${hash}` : "" });
      if (hash) window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  };

  const markAll = () => {
    const ids = unread.map((n) => n.id);
    setItems((l) => l.map((x) => ({ ...x, is_read: true })));
    atsService.markRead(ids).catch(() => undefined);
  };

  const savePrefs = async () => {
    if (!prefs) return;
    setPrefsError("");
    if (prefs.notify_whatsapp && prefs.phone.replace(/\D/g, "").length < 8) {
      setPrefsError("Indiquez votre numéro WhatsApp (ex. : +224 6XX XX XX XX).");
      return;
    }
    setSaving(true);
    try {
      await atsService.setNotifyPrefs({ notify_email: prefs.notify_email, notify_whatsapp: prefs.notify_whatsapp, phone: prefs.phone.trim() });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setPrefsError("Les réglages n'ont pas pu être enregistrés.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTab("list"); }}
        aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} non lue${unread.length > 1 ? "s" : ""}` : "Notifications"}
        className="relative h-10 w-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-[#050FA0] transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#E4220F] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-12 sm:right-0 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-bold text-slate-900">{tab === "list" ? "Notifications" : "Recevoir mes notifications"}</p>
            <div className="flex items-center gap-1">
              {tab === "list" && unread.length > 0 && (
                <button type="button" onClick={markAll} className="text-xs font-semibold text-[#050FA0] hover:underline px-2">Tout marquer comme lu</button>
              )}
              <button type="button" onClick={() => setTab(tab === "list" ? "settings" : "list")} aria-label={tab === "list" ? "Réglages" : "Retour aux notifications"} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
                {tab === "list" ? <Settings2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {tab === "list" ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#050FA0]" /></div>
              ) : items.length === 0 ? (
                <p className="py-10 px-6 text-center text-sm text-slate-500">Aucune notification pour le moment.</p>
              ) : (
                <ul className="divide-y">
                  {items.map((n) => {
                    const Icon = ICONS[n.type] || Info;
                    return (
                      <li key={n.id}>
                        <button type="button" onClick={() => openItem(n)} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 ${n.is_read ? "" : "bg-[#050FA0]/[0.04]"}`}>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "interview" ? "bg-violet-100 text-violet-700" : "bg-[#050FA0]/10 text-[#050FA0]"}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${n.is_read ? "text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</span>
                            <span className="block text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</span>
                            <span className="block text-[11px] text-slate-400 mt-1">{ago(n.created_at)}</span>
                          </span>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-[#E4220F] mt-2 shrink-0" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500">En plus de la plateforme, recevez les confirmations, convocations, rappels d&apos;entretien et mises à jour de vos dossiers :</p>
              {!prefs && !prefsError && <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#050FA0]" /></div>}
              {prefs && (
                <>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#050FA0]" checked={prefs.notify_email} onChange={(e) => setPrefs({ ...prefs, notify_email: e.target.checked })} />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Mail className="h-4 w-4" /> Par e-mail</span>
                      <span className="block text-xs text-slate-500">À l&apos;adresse de votre compte.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#25D366]" checked={prefs.notify_whatsapp} onChange={(e) => setPrefs({ ...prefs, notify_whatsapp: e.target.checked })} />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><MessageCircle className="h-4 w-4 text-[#25D366]" /> Par WhatsApp</span>
                      <span className="block text-xs text-slate-500">J&apos;accepte de recevoir des messages de ProJob AI sur WhatsApp.</span>
                    </span>
                  </label>
                  {prefs.notify_whatsapp && (
                    <label className="block text-sm">
                      <span className="block font-semibold text-slate-700 mb-1">Numéro WhatsApp</span>
                      <input type="tel" value={prefs.phone} onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })} placeholder="+224 6XX XX XX XX" className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-[#050FA0] outline-none text-sm" />
                    </label>
                  )}
                  <button type="button" onClick={savePrefs} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#050FA0] text-white text-sm font-bold hover:bg-[#060C6E] disabled:opacity-60">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saved ? "Enregistré ✓" : "Enregistrer"}
                  </button>
                </>
              )}
              {prefsError && <p role="alert" className="text-xs text-red-700">{prefsError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
