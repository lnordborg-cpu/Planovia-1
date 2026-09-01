import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { fromISODate, formatDateLong } from "@/lib/dateUtils";
import { allMaterials } from "@/lib/plannerHelpers";
import { Link as LinkIcon, Folder } from "lucide-react";

export default function Material() {
  const planner = usePlanner();
  const materials = useMemo(() => allMaterials(planner.events, planner.classes, planner.subjects), [planner.events, planner.classes, planner.subjects]);

  return (
    <div className="space-y-6" data-testid="page-material">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Materialbank</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Material</h1>
        <p className="text-sm text-[#656E67] mt-2 max-w-xl">
          Alla material som du lägger till på lektioner samlas automatiskt här.
        </p>
      </header>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6E1DA] p-10 text-center">
          <Folder className="h-6 w-6 text-[#8A948C] mx-auto" />
          <div className="text-sm text-[#8A948C] mt-2">Inga material tillagda ännu.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {materials.map((m) => {
            const subj = planner.subjects.find((s) => s.id === m.subjectId);
            const color = subj ? getSubjectColor(subj.colorId) : null;
            const klass = planner.classes.find((c) => c.id === m.classId);
            return (
              <div key={m.id} className="rounded-xl border border-[#E6E1DA] bg-white p-4" data-testid={`material-row-${m.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  {subj && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold"
                      style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                      {subj.name}
                    </span>
                  )}
                  {klass && <span className="text-xs text-[#656E67]">{klass.name}</span>}
                  <span className="text-xs text-[#8A948C] ml-auto">{formatDateLong(fromISODate(m.date))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-[#656E67]" />
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-[#3D5A45] underline underline-offset-2 text-sm">{m.name}</a>
                  ) : (
                    <span className="text-sm">{m.name}</span>
                  )}
                </div>
                {m.eventTitle && <div className="text-xs text-[#8A948C] mt-1">Från lektion: {m.eventTitle}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
