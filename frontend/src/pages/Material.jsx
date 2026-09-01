import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { fromISODate, formatDateLong } from "@/lib/dateUtils";
import { allMaterials } from "@/lib/plannerHelpers";
import { Link as LinkIcon, Folder, FileText, Eye } from "lucide-react";
import MaterialPreview, { canPreview } from "@/components/dialogs/MaterialPreview";

export default function Material() {
  const planner = usePlanner();
  const materials = useMemo(() => allMaterials(planner.events, planner.classes, planner.subjects), [planner.events, planner.classes, planner.subjects]);
  const [previewMaterial, setPreviewMaterial] = useState(null);

  return (
    <div className="space-y-6" data-testid="page-material">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Materialbank</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#293330]">Material</h1>
        <p className="text-sm text-[#78817D] mt-2 max-w-xl">
          Alla material som du lägger till på lektioner samlas automatiskt här.
        </p>
      </header>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DEDAD2] p-10 text-center">
          <Folder className="h-6 w-6 text-[#A3A69F] mx-auto" />
          <div className="text-sm text-[#A3A69F] mt-2">Inga material tillagda ännu.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {materials.map((m) => {
            const subj = planner.subjects.find((s) => s.id === m.subjectId);
            const color = subj ? getSubjectColor(subj.colorId) : null;
            const klass = planner.classes.find((c) => c.id === m.classId);
            const previewable = canPreview(m);
            return (
              <div key={m.id} className="rounded-xl border border-[#DEDAD2] bg-white p-4" data-testid={`material-row-${m.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  {subj && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold"
                      style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                      {subj.name}
                    </span>
                  )}
                  {klass && <span className="text-xs text-[#78817D]">{klass.name}</span>}
                  <span className="text-xs text-[#A3A69F] ml-auto">{formatDateLong(fromISODate(m.date))}</span>
                </div>
                <div className="flex items-center gap-2">
                  {m.isFile ? <FileText className="h-3.5 w-3.5 text-[#718A7F]" /> : <LinkIcon className="h-3.5 w-3.5 text-[#78817D]" />}
                  {previewable && m.url ? (
                    <button
                      onClick={() => setPreviewMaterial(m)}
                      className="text-[#718A7F] underline underline-offset-2 text-sm text-left hover:text-[#5C7267]"
                      data-testid={`material-preview-${m.id}`}
                    >
                      {m.name}
                    </button>
                  ) : m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-[#718A7F] underline underline-offset-2 text-sm">{m.name}</a>
                  ) : (
                    <span className="text-sm">{m.name}</span>
                  )}
                  {previewable && m.url && (
                    <button
                      onClick={() => setPreviewMaterial(m)}
                      className="ml-auto text-[#78817D] hover:text-[#718A7F] p-1 rounded hover:bg-[#EFEAE1]"
                      title="Förhandsgranska"
                      data-testid={`material-preview-btn-${m.id}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {m.eventTitle && <div className="text-xs text-[#A3A69F] mt-1">Från lektion: {m.eventTitle}</div>}
              </div>
            );
          })}
        </div>
      )}

      <MaterialPreview material={previewMaterial} onOpenChange={(v) => !v && setPreviewMaterial(null)} />
    </div>
  );
}
