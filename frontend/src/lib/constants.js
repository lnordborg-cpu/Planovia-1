export const SUBJECT_COLORS = [
  { id: "sky", name: "Dammig blå", bg: "#DCE7EF", text: "#375062", border: "#C1D3E0" },
  { id: "rose", name: "Dammig ros", bg: "#EEDDDD", text: "#6F3C3C", border: "#DFC6C6" },
  { id: "sage", name: "Salvia", bg: "#DFE9E2", text: "#47594E", border: "#C7D6CB" },
  { id: "clay", name: "Terrakotta", bg: "#EEDACB", text: "#7B4B31", border: "#DFC3AC" },
  { id: "lilac", name: "Lavendel", bg: "#E8E0EC", text: "#4E3A5D", border: "#D4C7DA" },
  { id: "honey", name: "Smörgul", bg: "#F2E8C8", text: "#6B5A2A", border: "#E1D3A9" },
  { id: "sand", name: "Sand", bg: "#EFE3D2", text: "#8C6B44", border: "#DDC9AE" },
  { id: "mist", name: "Dimma", bg: "#E5E5E0", text: "#455955", border: "#D1D1C9" },
];

export const CLASS_COLORS = SUBJECT_COLORS;
export const getClassColor = (colorId) =>
  CLASS_COLORS.find((c) => c.id === colorId) || null;

export const getSubjectColor = (colorId) =>
  SUBJECT_COLORS.find((c) => c.id === colorId) || SUBJECT_COLORS[0];

export const WEEKDAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];
export const WEEKDAYS_SHORT = ["Mån", "Tis", "Ons", "Tor", "Fre"];

export const TASK_CATEGORIES = [
  "Internt",
  "Lektion",
  "Planering",
  "Skriv ut",
  "Övrigt",
  "Uppföljning",
];

export const CATEGORY_STYLES = {
  Internt: "bg-[#E5E5E0] text-[#455955] border-[#D1D1C9]",
  Lektion: "bg-[#DFE9E2] text-[#47594E] border-[#C7D6CB]",
  Planering: "bg-[#DCE7EF] text-[#375062] border-[#C1D3E0]",
  "Skriv ut": "bg-[#F2E8C8] text-[#6B5A2A] border-[#E1D3A9]",
  Övrigt: "bg-[#EFE3D2] text-[#8C6B44] border-[#DDC9AE]",
  Uppföljning: "bg-[#E8E0EC] text-[#4E3A5D] border-[#D4C7DA]",
};

export const PRIORITIES = ["Normal", "Viktig", "Hög"];
export const PRIORITY_VALUES = { Normal: 0, Viktig: 1, Hög: 2 };
export const PRIORITY_STYLES = {
  Normal: "bg-[#EFEAE1] text-[#78817D] border-[#DEDAD2]",
  Viktig: "bg-[#F2E8C8] text-[#6B5A2A] border-[#E1D3A9]",
  Hög: "bg-[#EEDDDD] text-[#6F3C3C] border-[#DFC6C6]",
};

export const EVENT_TYPES = {
  lesson: { label: "Lektion", badge: "bg-[#DFE9E2] text-[#47594E]" },
  meeting: { label: "Möte", badge: "bg-[#DCE7EF] text-[#375062]" },
  utvecklingssamtal: { label: "Utvecklingssamtal", badge: "bg-[#E8E0EC] text-[#4E3A5D]" },
};

export const EXCEPTION_TYPES = [
  { id: "lov", label: "Lov", badge: "bg-[#EFE3D2] text-[#8C6B44] border-[#DDC9AE]" },
  { id: "studiedag", label: "Studiedag", badge: "bg-[#DFE9E2] text-[#47594E] border-[#C7D6CB]" },
  { id: "temadag", label: "Temadag", badge: "bg-[#DCE7EF] text-[#375062] border-[#C1D3E0]" },
  { id: "provperiod", label: "Provperiod", badge: "bg-[#EEDDDD] text-[#6F3C3C] border-[#DFC6C6]" },
  { id: "projekt", label: "Projekt", badge: "bg-[#E8E0EC] text-[#4E3A5D] border-[#D4C7DA]" },
  { id: "utflykt", label: "Utflykt", badge: "bg-[#F2E8C8] text-[#6B5A2A] border-[#E1D3A9]" },
];

export const getExceptionType = (id) =>
  EXCEPTION_TYPES.find((t) => t.id === id) || EXCEPTION_TYPES[0];
