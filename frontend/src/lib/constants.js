export const SUBJECT_COLORS = [
  { id: "sage", name: "Salvia", bg: "#EFF5F0", text: "#2D5A3A", border: "#D2E4D5" },
  { id: "clay", name: "Tegel", bg: "#FDF2F0", text: "#9E4A3B", border: "#F5D5D0" },
  { id: "honey", name: "Honung", bg: "#FEF8EC", text: "#8C5E14", border: "#F9E8C7" },
  { id: "sky", name: "Himmel", bg: "#F0F5FA", text: "#2C5282", border: "#D0E1F3" },
  { id: "lilac", name: "Lila", bg: "#F6F2FB", text: "#5A3B8B", border: "#E2D5F3" },
  { id: "sand", name: "Sand", bg: "#FCF5EE", text: "#8C4A27", border: "#F5DCB8" },
  { id: "mist", name: "Dimma", bg: "#F1F4F3", text: "#455955", border: "#DAE0DE" },
  { id: "rose", name: "Ros", bg: "#FCF0F4", text: "#A03E64", border: "#F5D0DE" },
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
  Internt: "bg-[#F1F4F3] text-[#455955] border-[#DAE0DE]",
  Lektion: "bg-[#EFF5F0] text-[#2D5A3A] border-[#D2E4D5]",
  Planering: "bg-[#F0F5FA] text-[#2C5282] border-[#D0E1F3]",
  "Skriv ut": "bg-[#FEF8EC] text-[#8C5E14] border-[#F9E8C7]",
  Övrigt: "bg-[#FCF5EE] text-[#8C4A27] border-[#F5DCB8]",
  Uppföljning: "bg-[#F6F2FB] text-[#5A3B8B] border-[#E2D5F3]",
};

export const PRIORITIES = ["Normal", "Viktig", "Hög"];
export const PRIORITY_VALUES = { Normal: 0, Viktig: 1, Hög: 2 };
export const PRIORITY_STYLES = {
  Normal: "bg-[#F3EFEA] text-[#656E67] border-[#E6E1DA]",
  Viktig: "bg-[#FEF8EC] text-[#8C5E14] border-[#F9E8C7]",
  Hög: "bg-[#FDF2F0] text-[#9E4A3B] border-[#F5D5D0]",
};

export const EVENT_TYPES = {
  lesson: { label: "Lektion", badge: "bg-[#EFF5F0] text-[#2D5A3A]" },
  meeting: { label: "Möte", badge: "bg-[#F0F5FA] text-[#2C5282]" },
  utvecklingssamtal: { label: "Utvecklingssamtal", badge: "bg-[#F6F2FB] text-[#5A3B8B]" },
};

export const EXCEPTION_TYPES = [
  { id: "lov", label: "Lov", badge: "bg-[#FFF3EC] text-[#C05621] border-[#FBD38D]" },
  { id: "studiedag", label: "Studiedag", badge: "bg-[#E6FFFA] text-[#234E52] border-[#B2F5EA]" },
  { id: "temadag", label: "Temadag", badge: "bg-[#EBF8FF] text-[#2B6CB0] border-[#BEE3F8]" },
  { id: "provperiod", label: "Provperiod", badge: "bg-[#FFF5F5] text-[#C53030] border-[#FEB2B2]" },
  { id: "projekt", label: "Projekt", badge: "bg-[#F6F2FB] text-[#5A3B8B] border-[#E2D5F3]" },
  { id: "utflykt", label: "Utflykt", badge: "bg-[#FEF8EC] text-[#8C5E14] border-[#F9E8C7]" },
];

export const getExceptionType = (id) =>
  EXCEPTION_TYPES.find((t) => t.id === id) || EXCEPTION_TYPES[0];
