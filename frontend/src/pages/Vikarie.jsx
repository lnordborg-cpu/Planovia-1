import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchSharedWeek } from "@/lib/shareApi";
import { PlanoviaMark } from "@/components/PlanoviaLogo";
import { Loader2, Printer, Clock, MapPin, Users, FileText, Link as LinkIcon, HeartHandshake, AlertTriangle, CalendarX } from "lucide-react";

const BG = "#F6F3EE";
const CARD = "#FFFEFB";
const BORDER = "#DEDAD2";
const INK = "#293330";
const MUTED = "#78817D";

const KIND_LABEL = {
  lesson: "Lektion",
  meeting: "Möte",
  utvecklingssamtal: "Utvecklingssamtal",
  timetable: "Lektion (schema)",
};

const KindBadge = ({ kind }) => (
  <span
    className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-semibold"
    style={{ backgroundColor: "#F6F3EE", color: MUTED, borderColor: BORDER }}
  >
    {KIND_LABEL[kind] || kind}
  </span>
);

const ItemCard = ({ item }) => {
  const color = item.subject_color || { bg: "#EFEAE1", text: "#293330", border: BORDER };
  return (
    <article
      className="rounded-xl border p-4 print:break-inside-avoid"
      style={{ backgroundColor: CARD, borderColor: BORDER }}
      data-testid="vikarie-item"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {item.subject_name && (
            <span
              className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border font-semibold"
              style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
            >
              {item.subject_name}
            </span>
          )}
          {item.class_name && (
            <span className="text-xs font-medium" style={{ color: INK }}>· {item.class_name}</span>
          )}
          <KindBadge kind={item.kind} />
        </div>
        <div className="flex items-center gap-1.5 text-sm tabular-nums" style={{ color: INK }}>
          <Clock className="h-3.5 w-3.5" style={{ color: "#718A7F" }} />
          <span className="font-semibold">{item.time_range || item.time}</span>
        </div>
      </div>

      <h3 className="font-serif-display text-xl mt-2" style={{ color: INK, lineHeight: 1.2 }}>
        {item.title}
      </h3>

      {item.location && (
        <div className="mt-2 text-xs flex items-center gap-1.5" style={{ color: MUTED }}>
          <MapPin className="h-3.5 w-3.5" /> {item.location}
        </div>
      )}
      {item.unit_title && (
        <div className="mt-1 text-xs" style={{ color: MUTED }}>
          Arbetsområde: <span className="font-medium" style={{ color: INK }}>{item.unit_title}</span>
        </div>
      )}
      {item.participants && (
        <div className="mt-1 text-xs flex items-start gap-1.5" style={{ color: MUTED }}>
          <Users className="h-3.5 w-3.5 mt-0.5" />
          <span className="whitespace-pre-wrap">{item.participants}</span>
        </div>
      )}

      {item.substitute_note && (
        <div
          className="mt-3 rounded-lg p-3 border"
          style={{ backgroundColor: "#EFF5F0", borderColor: "#D2E4D5" }}
          data-testid="vikarie-substitute-note"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#47594E" }}>
            <HeartHandshake className="h-3.5 w-3.5" /> Info till vikarie
          </div>
          <div className="mt-1 text-sm whitespace-pre-wrap" style={{ color: INK }}>
            {item.substitute_note}
          </div>
        </div>
      )}

      <Section title="Mål" body={item.goals} />
      <Section title="Lektionsplan" body={item.plan} />
      <Section title="Förberedelser" body={item.preparation} />
      <Section title="Läxa" body={item.homework} />
      <Section title="Anteckningar" body={item.notes} />

      {(item.materials || []).length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: MUTED }}>Material</div>
          <ul className="space-y-1">
            {item.materials.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm rounded-lg border px-2.5 py-1.5" style={{ borderColor: BORDER, backgroundColor: CARD, color: INK }}>
                {m.isFile ? <FileText className="h-3.5 w-3.5" style={{ color: "#718A7F" }} /> : <LinkIcon className="h-3.5 w-3.5" style={{ color: MUTED }} />}
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 flex-1 truncate" style={{ color: "#718A7F" }}>
                    {m.name}
                  </a>
                ) : (
                  <span className="flex-1 truncate">{m.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

const Section = ({ title, body }) => {
  if (!body || !String(body).trim()) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: MUTED }}>{title}</div>
      <div className="text-sm whitespace-pre-wrap" style={{ color: INK }}>{body}</div>
    </div>
  );
};

const DayHeader = ({ day }) => (
  <header className="pt-6 pb-3">
    <div className="flex items-baseline gap-3 flex-wrap">
      <h2 className="font-serif-display text-2xl" style={{ color: INK }}>{day.weekday_name}</h2>
      <span className="text-sm" style={{ color: MUTED }}>{day.date_short}</span>
      {day.hide_regular && (
        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-semibold" style={{ backgroundColor: "#EFE3D2", color: "#8C6B44", borderColor: "#DDC9AE" }}>
          Ordinarie lektioner inställda
        </span>
      )}
    </div>
    {day.exceptions.length > 0 && (
      <div className="mt-1 flex flex-wrap gap-1.5">
        {day.exceptions.map((ex, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md border" style={{ backgroundColor: "#EFE3D2", color: "#8C6B44", borderColor: "#DDC9AE" }}>
            {ex.type_label}: {ex.title}
          </span>
        ))}
      </div>
    )}
  </header>
);

export default function Vikarie() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | expired | error
  const [snapshot, setSnapshot] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    document.title = "Vikarievy – Planovia";
    let alive = true;
    (async () => {
      try {
        const data = await fetchSharedWeek(token);
        if (!alive) return;
        setSnapshot(data.week_data || {});
        setMeta({ label: data.label, expires_at: data.expires_at });
        setStatus("ready");
      } catch (err) {
        if (!alive) return;
        if (err.message === "not_found") setStatus("notfound");
        else if (err.message === "expired") setStatus("expired");
        else setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Laddar veckan…
        </div>
      </div>
    );
  }

  if (status === "notfound" || status === "expired" || status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: BG, color: INK }}>
        <div className="max-w-md w-full rounded-2xl border p-8 text-center" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="flex justify-center mb-3">
            {status === "expired" ? <CalendarX className="h-8 w-8 text-[#B49E6A]" /> : <AlertTriangle className="h-8 w-8 text-[#9E4A3B]" />}
          </div>
          <h1 className="font-serif-display text-2xl">
            {status === "expired" ? "Länken har gått ut" : status === "notfound" ? "Länken hittades inte" : "Något gick fel"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>
            {status === "expired"
              ? "Delningslänkar utgår automatiskt efter 7 dagar. Be läraren skapa en ny."
              : status === "notfound"
              ? "Länken har antingen återkallats eller aldrig funnits."
              : "Kunde inte hämta veckan just nu. Försök igen om en stund."}
          </p>
        </div>
      </div>
    );
  }

  const days = snapshot?.days || [];
  const totalItems = days.reduce((n, d) => n + (d.items?.length || 0), 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, color: INK }} data-testid="page-vikarie">
      <div className="max-w-4xl mx-auto px-6 py-10 print:px-0 print:py-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap mb-2 print:hidden">
          <div className="flex items-center gap-3">
            <PlanoviaMark size={44} />
            <div>
              <div className="font-display font-bold tracking-tight text-2xl" style={{ color: "#3B4A44", lineHeight: 1 }}>Planovia</div>
              <div className="text-xs tracking-wide" style={{ color: "#5E6B65" }}>Vikarievy</div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-white transition"
            style={{ borderColor: BORDER, color: INK, backgroundColor: CARD }}
            data-testid="vikarie-print-btn"
          >
            <Printer className="h-4 w-4" /> Skriv ut / spara som PDF
          </button>
        </header>

        <div className="mt-4">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#A3A69F" }}>
            Vecka {snapshot?.week} · {snapshot?.year}
          </div>
          <h1 className="font-serif-display text-4xl mt-1" style={{ color: INK }} data-testid="vikarie-title">
            {snapshot?.teacher_name ? `${snapshot.teacher_name}s vecka` : "Veckoplanering för vikarie"}
          </h1>
          <div className="mt-1 text-sm" style={{ color: MUTED }}>
            {snapshot?.monday_iso} – {snapshot?.friday_iso} · {totalItems} planerade händelser
          </div>
        </div>

        {/* Days */}
        <div className="mt-4 divide-y" style={{ borderColor: BORDER }}>
          {days.map((day) => (
            <section key={day.iso} data-testid={`vikarie-day-${day.iso}`}>
              <DayHeader day={day} />
              {day.items.length === 0 ? (
                <div className="text-sm italic pb-4" style={{ color: "#A3A69F" }}>
                  {day.hide_regular ? "Inga ordinarie lektioner denna dag." : "Inget planerat."}
                </div>
              ) : (
                <div className="space-y-3 pb-6">
                  {day.items.map((it, i) => (
                    <ItemCard key={i} item={it} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-10 pt-4 border-t text-xs flex justify-between print:hidden" style={{ borderColor: BORDER, color: "#A3A69F" }}>
          <span>Planovia · Din digitala lärarplanerare</span>
          {meta?.expires_at && (
            <span>Länken gäller till {new Date(meta.expires_at).toLocaleDateString("sv-SE")}</span>
          )}
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
