import React, { useMemo, useRef, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor, MATERIAL_SUBCATEGORIES, autoClassifyMaterial } from "@/lib/constants";
import { fromISODate, formatDateLong } from "@/lib/dateUtils";
import { allMaterials } from "@/lib/plannerHelpers";
import { Link as LinkIcon, Folder, FolderOpen, FileText, Eye, Upload, ChevronRight, ChevronDown, Plus, Trash2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import MaterialPreview, { canPreview } from "@/components/dialogs/MaterialPreview";

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Path convention: "subject:<id>" or "subject:<id>/<subcategory>" or "root"
const ROOT = "root";
const OTHER = "subject:none";

export default function Material() {
  const planner = usePlanner();
  const materials = useMemo(
    () => allMaterials(planner.events, planner.classes, planner.subjects, planner.standaloneMaterials || []),
    [planner.events, planner.classes, planner.subjects, planner.standaloneMaterials],
  );
  const [selectedPath, setSelectedPath] = useState(ROOT);
  const [expanded, setExpanded] = useState(() => new Set([ROOT]));
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [newFolderInput, setNewFolderInput] = useState({ subjectId: null, name: "" });
  const [uploadTarget, setUploadTarget] = useState({ subjectId: null, subcategory: "Övrigt" });
  const fileRef = useRef(null);

  const toggle = (key) => setExpanded((s) => {
    const n = new Set(s);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  const subjects = planner.subjects;
  const custom = planner.customSubcategories || [];

  // Count per bucket
  const counts = useMemo(() => {
    const c = { [ROOT]: materials.length };
    materials.forEach((m) => {
      const sid = m.subjectId || "none";
      const sc = m.subcategory || "Övrigt";
      const pS = `subject:${sid}`;
      const pSC = `${pS}/${sc}`;
      c[pS] = (c[pS] || 0) + 1;
      c[pSC] = (c[pSC] || 0) + 1;
    });
    return c;
  }, [materials]);

  // Filter materials by selected path
  const visible = useMemo(() => {
    if (selectedPath === ROOT) return materials;
    if (selectedPath.startsWith("subject:")) {
      const parts = selectedPath.split("/");
      const subjectId = parts[0].split(":")[1];
      const subcategory = parts[1];
      return materials.filter((m) => {
        const sid = m.subjectId || "none";
        if (sid !== subjectId) return false;
        if (subcategory) return (m.subcategory || "Övrigt") === subcategory;
        return true;
      });
    }
    return materials;
  }, [selectedPath, materials]);

  const subcategoriesForSubject = (subjectId) => {
    const customNames = custom.filter((c) => (c.subjectId || "none") === (subjectId || "none")).map((c) => c.name);
    return [...MATERIAL_SUBCATEGORIES, ...customNames.filter((n) => !MATERIAL_SUBCATEGORIES.includes(n))];
  };

  const handleUpload = async (files, targetSubjectId, targetSubcategory) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        if (file.size > 4 * 1024 * 1024) { toast.error(`${file.name} är för stor (max 4MB).`); continue; }
        const url = await readFileAsDataUrl(file);
        const subcategory = targetSubcategory || autoClassifyMaterial(file.name);
        planner.addStandaloneMaterial({
          name: file.name,
          url,
          isFile: true,
          mimeType: file.type,
          size: file.size,
          subjectId: targetSubjectId || null,
          subcategory,
        });
      } catch { toast.error(`Kunde inte läsa ${file.name}`); }
    }
    toast.success(`${files.length} fil${files.length > 1 ? "er" : ""} tillagd${files.length > 1 ? "a" : ""}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openUploadFor = (subjectId, subcategory) => {
    setUploadTarget({ subjectId, subcategory });
    fileRef.current?.click();
  };

  const addCustomFolder = () => {
    if (!newFolderInput.name.trim()) return;
    planner.addCustomSubcategory(newFolderInput.subjectId, newFolderInput.name);
    setNewFolderInput({ subjectId: null, name: "" });
    toast.success("Mapp skapad");
  };

  const moveMaterial = (m, newSubjectId, newSubcategory) => {
    const ref = m.source === "event"
      ? { source: "event", eventId: m.eventId, materialId: m.materialId }
      : { source: "standalone", standaloneId: m.standaloneId };
    planner.moveMaterialToFolder(ref, newSubjectId, newSubcategory);
  };

  const deleteMaterial = (m) => {
    if (m.source === "standalone") planner.deleteStandaloneMaterial(m.standaloneId);
    else planner.removeMaterialFromEvent(m.eventId, m.materialId);
  };

  const selectedBreadcrumb = useMemo(() => {
    if (selectedPath === ROOT) return "Alla material";
    const parts = selectedPath.split("/");
    const subjectId = parts[0].split(":")[1];
    const subj = subjectId === "none" ? { name: "Utan ämne" } : subjects.find((s) => s.id === subjectId) || { name: "Ämne" };
    return parts[1] ? `${subj.name} · ${parts[1]}` : subj.name;
  }, [selectedPath, subjects]);

  return (
    <div className="space-y-6" data-testid="page-material">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Materialbank</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#293330]">Material</h1>
        <p className="text-sm text-[#78817D] mt-2 max-w-xl">
          Filer sorteras automatiskt in i rätt ämne och kategori. Du kan ladda upp fler filer eller skapa egna mappar.
        </p>
      </header>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files, uploadTarget.subjectId, uploadTarget.subcategory)}
        data-testid="material-file-input"
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Folder tree */}
        <aside className="col-span-4 lg:col-span-3">
          <div className="rounded-2xl border border-[#DEDAD2] bg-[#FFFEFB] p-3 space-y-0.5" data-testid="material-tree">
            <FolderNode
              icon={FolderOpen}
              label="Alla material"
              count={counts[ROOT] || 0}
              active={selectedPath === ROOT}
              onClick={() => setSelectedPath(ROOT)}
              testId="folder-all"
            />
            {[...subjects, { id: "none", name: "Utan ämne", colorId: null }].map((subj) => {
              const key = `subject:${subj.id}`;
              const isOpen = expanded.has(key);
              const subs = subcategoriesForSubject(subj.id);
              const col = subj.colorId ? getSubjectColor(subj.colorId) : null;
              return (
                <div key={subj.id}>
                  <FolderNode
                    icon={isOpen ? FolderOpen : Folder}
                    label={subj.name}
                    count={counts[key] || 0}
                    active={selectedPath === key}
                    onClick={() => { toggle(key); setSelectedPath(key); }}
                    accentColor={col?.text}
                    chevron={isOpen ? "down" : "right"}
                    testId={`folder-${subj.id}`}
                    depth={0}
                  />
                  {isOpen && (
                    <div className="ml-3 border-l border-[#DEDAD2] pl-1 mt-0.5">
                      {subs.map((sc) => {
                        const scKey = `${key}/${sc}`;
                        return (
                          <FolderNode
                            key={sc}
                            icon={Folder}
                            label={sc}
                            count={counts[scKey] || 0}
                            active={selectedPath === scKey}
                            onClick={() => setSelectedPath(scKey)}
                            depth={1}
                            testId={`folder-${subj.id}-${sc}`}
                          />
                        );
                      })}
                      <div className="pl-3 py-1">
                        {newFolderInput.subjectId === subj.id ? (
                          <div className="flex gap-1">
                            <Input
                              autoFocus
                              value={newFolderInput.name}
                              onChange={(e) => setNewFolderInput({ ...newFolderInput, name: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") addCustomFolder(); if (e.key === "Escape") setNewFolderInput({ subjectId: null, name: "" }); }}
                              placeholder="Mappnamn"
                              className="h-7 text-xs"
                              data-testid={`new-folder-input-${subj.id}`}
                            />
                            <Button size="sm" className="h-7 bg-[#718A7F] hover:bg-[#5C7267]" onClick={addCustomFolder}>OK</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setNewFolderInput({ subjectId: subj.id, name: "" })}
                            className="text-[11px] text-[#78817D] hover:text-[#293330] flex items-center gap-1"
                            data-testid={`new-folder-btn-${subj.id}`}
                          >
                            <Plus className="h-3 w-3" /> Ny mapp
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Files list */}
        <section className="col-span-8 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#A3A69F]">Mapp</div>
              <div className="font-serif-display text-xl text-[#293330]">{selectedBreadcrumb}</div>
            </div>
            <Button
              onClick={() => {
                const parts = selectedPath.split("/");
                const sid = selectedPath.startsWith("subject:") ? parts[0].split(":")[1] : null;
                const sc = parts[1] || null;
                openUploadFor(sid === "none" ? null : sid, sc || "Övrigt");
              }}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
              data-testid="material-upload-btn"
            >
              <Upload className="h-4 w-4 mr-2" /> Ladda upp
            </Button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DEDAD2] p-10 text-center">
              <Folder className="h-6 w-6 text-[#A3A69F] mx-auto" />
              <div className="text-sm text-[#A3A69F] mt-2">Inga material i denna mapp ännu.</div>
              <div className="text-xs text-[#A3A69F] mt-1">Ladda upp filer eller lägg till dem via en lektion.</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {visible.map((m) => {
                const subj = planner.subjects.find((s) => s.id === m.subjectId);
                const color = subj ? getSubjectColor(subj.colorId) : null;
                const previewable = canPreview(m);
                return (
                  <div key={m.id} className="rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-4 group" data-testid={`material-row-${m.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {subj && color && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold"
                          style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                          {subj.name}
                        </span>
                      )}
                      {m.subcategory && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#EFEAE1] text-[#78817D]">{m.subcategory}</span>
                      )}
                      {m.date && <span className="text-xs text-[#A3A69F] ml-auto">{formatDateLong(fromISODate(m.date))}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {m.isFile ? <FileText className="h-3.5 w-3.5 text-[#718A7F]" /> : <LinkIcon className="h-3.5 w-3.5 text-[#78817D]" />}
                      {previewable && m.url ? (
                        <button onClick={() => setPreviewMaterial(m)} className="text-[#718A7F] underline underline-offset-2 text-sm text-left" data-testid={`material-preview-${m.id}`}>
                          {m.name}
                        </button>
                      ) : m.url ? (
                        <a href={m.url} target="_blank" rel="noreferrer" className="text-[#718A7F] underline underline-offset-2 text-sm">{m.name}</a>
                      ) : (
                        <span className="text-sm">{m.name}</span>
                      )}
                      {m.isFile && m.size && <span className="text-[10px] text-[#A3A69F] ml-auto tabular-nums">{Math.round(m.size / 1024)} kB</span>}
                    </div>
                    {m.eventTitle && <div className="text-xs text-[#A3A69F] mt-1">Från lektion: {m.eventTitle}</div>}
                    <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <MoveMenu material={m} subjects={subjects} onMove={moveMaterial} customFolders={custom} />
                      {previewable && m.url && (
                        <Button size="sm" variant="outline" className="h-7 px-2 border-[#DEDAD2] text-[#78817D]" onClick={() => setPreviewMaterial(m)} data-testid={`material-preview-btn-${m.id}`}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[#78817D] hover:text-[#6F3C3C] ml-auto" onClick={() => deleteMaterial(m)} data-testid={`material-delete-${m.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <MaterialPreview material={previewMaterial} onOpenChange={(v) => !v && setPreviewMaterial(null)} />
    </div>
  );
}

const FolderNode = ({ icon: Icon, label, count, active, onClick, accentColor, chevron, depth = 0, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`w-full text-left flex items-center gap-2 pr-2 py-1.5 rounded-lg transition ${active ? "bg-[#DFE9E2] text-[#293330]" : "text-[#78817D] hover:bg-[#EFEAE1] hover:text-[#293330]"}`}
    style={{ paddingLeft: 8 + depth * 4 }}
  >
    {chevron === "down" && <ChevronDown className="h-3 w-3" />}
    {chevron === "right" && <ChevronRight className="h-3 w-3" />}
    {!chevron && <span className="w-3" />}
    <Icon className="h-3.5 w-3.5 flex-shrink-0" style={accentColor ? { color: accentColor } : {}} />
    <span className="text-sm flex-1 truncate">{label}</span>
    {count > 0 && <span className="text-[10px] tabular-nums text-[#A3A69F]">{count}</span>}
  </button>
);

const MoveMenu = ({ material, subjects, customFolders, onMove }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-7 px-2 border-[#DEDAD2] text-[#78817D]" onClick={() => setOpen((v) => !v)} data-testid={`material-move-${material.id}`}>
        <ArrowRight className="h-3 w-3 mr-1" /> Flytta
      </Button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 w-56 rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] shadow-md p-2 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-[#A3A69F] px-1">Flytta till</div>
          {[...subjects, { id: null, name: "Utan ämne" }].map((subj) => (
            <div key={subj.id || "none"}>
              <div className="text-xs font-semibold text-[#293330] px-1">{subj.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {["Presentationer", "Läxor", "Arbetsblad", "Prov", "Övrigt", ...customFolders.filter((c) => (c.subjectId || null) === subj.id).map((c) => c.name)].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => { onMove(material, subj.id, sc); setOpen(false); }}
                    className="text-[10px] px-1.5 py-0.5 rounded-md border border-[#DEDAD2] hover:bg-[#DFE9E2]"
                    data-testid={`move-target-${subj.id || "none"}-${sc}`}
                  >{sc}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
