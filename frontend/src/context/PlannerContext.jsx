import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { toISODate, dateInRange, weekdayIndex } from "@/lib/dateUtils";

const STORAGE_KEY = "lararplanerare_v1";

const emptyState = {
  classes: [],
  subjects: [],
  students: [],
  timetable: [],
  events: [],
  units: [],
  tasks: [],
  followups: [],
  calendarExceptions: [],
  studentNotes: [],
  meetingNotes: [],
  studentAdaptations: {},
  studentSupport: {},
  autoCompletedSlots: [],
  meetingTemplates: [],
  hasSeenSamtalSuggestion: false,
  userName: "",
  activeTerm: "auto", // 'auto' | 'ht' | 'vt'
  eveningMode: "auto", // 'auto' | 'on' | 'off'
  standaloneMaterials: [],
  customSubcategories: [], // [{id, subjectId, name}]
};

const PlannerContext = createContext(null);

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const PlannerProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...emptyState, ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
    return emptyState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }, [state]);

  // Auto-complete yesterday's recurring timetable lessons on mount (and daily while app is open)
  useEffect(() => {
    const run = () => {
      setState((s) => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const iso = toISODate(yesterday);
        const wd = weekdayIndex(yesterday);
        if (wd > 4) return s; // skip weekends
        const hidden = s.calendarExceptions.some((e) => e.hideRegularLessons && dateInRange(iso, e.startDate, e.endDate));
        if (hidden) return s;
        const already = new Set(s.autoCompletedSlots.map((a) => `${a.slotId}|${a.date}`));
        const materialised = new Set(s.events.filter((e) => e.timetableId && e.date === iso).map((e) => e.timetableId));
        const toAdd = s.timetable
          .filter((t) => t.weekday === wd && !already.has(`${t.id}|${iso}`) && !materialised.has(t.id))
          .map((t) => ({ slotId: t.id, date: iso }));
        if (toAdd.length === 0) return s;
        return { ...s, autoCompletedSlots: [...s.autoCompletedSlots, ...toAdd] };
      });
    };
    run();
    // Re-run each hour in case app stays open past midnight
    const iv = setInterval(run, 60 * 60 * 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generic setters
  const update = useCallback((partial) => setState((s) => ({ ...s, ...partial })), []);

  // ------- Classes -------
  const addClass = (name, colorId) => {
    const obj = { id: uid(), name: name.trim(), colorId: colorId || null };
    setState((s) => ({ ...s, classes: [...s.classes, obj] }));
    return obj;
  };
  const updateClass = (id, patch) =>
    setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const deleteClass = (id) =>
    setState((s) => ({
      ...s,
      classes: s.classes.filter((c) => c.id !== id),
      students: s.students.filter((st) => st.classId !== id),
      timetable: s.timetable.filter((t) => t.classId !== id),
    }));

  // ------- Subjects -------
  const addSubject = (name, colorId) => {
    const obj = { id: uid(), name: name.trim(), colorId };
    setState((s) => ({ ...s, subjects: [...s.subjects, obj] }));
    return obj;
  };
  const deleteSubject = (id) =>
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((sub) => sub.id !== id),
      timetable: s.timetable.filter((t) => t.subjectId !== id),
    }));

  // ------- Students -------
  const addStudent = (name, classId) => {
    const obj = { id: uid(), name: name.trim(), classId };
    setState((s) => ({ ...s, students: [...s.students, obj] }));
    return obj;
  };
  const deleteStudent = (id) =>
    setState((s) => ({
      ...s,
      students: s.students.filter((st) => st.id !== id),
      studentNotes: s.studentNotes.filter((n) => n.studentId !== id),
      meetingNotes: s.meetingNotes.filter((n) => n.studentId !== id),
      followups: s.followups.filter((f) => f.studentId !== id),
      tasks: s.tasks.filter((t) => !(t.sourceType === "followup" && s.followups.find((f) => f.id === t.sourceId)?.studentId === id)),
    }));

  // ------- Timetable -------
  const addTimetableSlot = (slot) => {
    const obj = { id: uid(), ...slot };
    setState((s) => ({ ...s, timetable: [...s.timetable, obj] }));
    return obj;
  };
  const deleteTimetableSlot = (id) =>
    setState((s) => ({ ...s, timetable: s.timetable.filter((t) => t.id !== id) }));

  // ------- Events (lessons, meetings, utvecklingssamtal) -------
  // Event fields: id, type, date, time, classId?, subjectId?, title, notes, completed, materials, unitId?, studentId?, participants?, timetableId? (for materialised)
  const upsertEvent = (event) => {
    const withId = event.id ? event : { id: uid(), ...event };
    setState((s) => {
      const exists = s.events.some((e) => e.id === withId.id);
      return {
        ...s,
        events: exists ? s.events.map((e) => (e.id === withId.id ? { ...e, ...withId } : e)) : [...s.events, withId],
      };
    });
    return withId;
  };
  const deleteEvent = (id) =>
    setState((s) => ({
      ...s,
      events: s.events.filter((e) => e.id !== id),
      tasks: s.tasks.filter((t) => !(t.sourceType === "material" && t.sourceId === id) && !(t.sourceType === "utvecklingssamtal_prep" && t.sourceId === id)),
    }));

  const toggleEventCompleted = (id) =>
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e)),
    }));

  const addMaterialToEvent = (eventId, material) => {
    // material: { name, url }
    setState((s) => ({
      ...s,
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, materials: [...(e.materials || []), { id: uid(), ...material }] } : e,
      ),
    }));
  };

  const removeMaterialFromEvent = (eventId, materialId) =>
    setState((s) => ({
      ...s,
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, materials: (e.materials || []).filter((m) => m.id !== materialId) } : e,
      ),
    }));

  // Create print task for a material
  const addPrintTaskForMaterial = (eventId, materialName, deadline) => {
    const obj = {
      id: uid(),
      title: `Skriv ut ${materialName}`,
      category: "Skriv ut",
      deadline,
      priority: "Normal",
      completed: false,
      sourceType: "material",
      sourceId: eventId,
    };
    setState((s) => ({ ...s, tasks: [...s.tasks, obj] }));
    return obj;
  };

  // Move an event to another date (drag & drop)
  const moveEventToDate = (id, newDate) =>
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === id ? { ...e, date: newDate, timetableId: null } : e)),
    }));

  // Copy all events from one ISO date range into another with same weekday offset
  // fromDates and toDates are arrays of ISO strings (Mon..Fri) of equal length
  const copyEventsBetweenDates = (fromDates, toDates) => {
    setState((s) => {
      const clones = [];
      s.events.forEach((e) => {
        const idx = fromDates.indexOf(e.date);
        if (idx === -1) return;
        clones.push({
          ...e,
          id: uid(),
          date: toDates[idx],
          completed: false,
          timetableId: null,
          materials: (e.materials || []).map((m) => ({ ...m, id: uid() })),
        });
      });
      return { ...s, events: [...s.events, ...clones] };
    });
  };


  // ------- Units (arbetsområden) -------
  const addUnit = (data) => {
    const obj = { id: uid(), ...data };
    setState((s) => ({ ...s, units: [...s.units, obj] }));
    return obj;
  };
  const updateUnit = (id, patch) =>
    setState((s) => ({ ...s, units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
  const deleteUnit = (id) =>
    setState((s) => ({
      ...s,
      units: s.units.filter((u) => u.id !== id),
      events: s.events.map((e) => (e.unitId === id ? { ...e, unitId: null } : e)),
    }));

  // ------- Tasks -------
  const addTask = (data) => {
    const obj = { id: uid(), completed: false, priority: "Normal", category: "Övrigt", ...data };
    setState((s) => ({ ...s, tasks: [...s.tasks, obj] }));
    return obj;
  };
  const updateTask = (id, patch) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const deleteTask = (id) =>
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  const toggleTaskCompleted = (id) => {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return s;
      const newCompleted = !task.completed;
      let followups = s.followups;
      // Sync followup completion if linked
      if (task.sourceType === "followup" && task.sourceId) {
        followups = s.followups.map((f) => (f.id === task.sourceId ? { ...f, completed: newCompleted } : f));
      }
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)),
        followups,
      };
    });
  };

  // ------- Followups (synchronised with tasks) -------
  const addFollowup = ({ studentId, description, dueDate }) => {
    const followup = { id: uid(), studentId, description, dueDate, completed: false };
    const task = {
      id: uid(),
      title: description,
      category: "Uppföljning",
      deadline: dueDate,
      priority: "Viktig",
      completed: false,
      sourceType: "followup",
      sourceId: followup.id,
    };
    setState((s) => ({ ...s, followups: [...s.followups, followup], tasks: [...s.tasks, task] }));
    return followup;
  };

  const toggleFollowupCompleted = (id) => {
    setState((s) => {
      const f = s.followups.find((x) => x.id === id);
      if (!f) return s;
      const newCompleted = !f.completed;
      return {
        ...s,
        followups: s.followups.map((x) => (x.id === id ? { ...x, completed: newCompleted } : x)),
        tasks: s.tasks.map((t) => (t.sourceType === "followup" && t.sourceId === id ? { ...t, completed: newCompleted } : t)),
      };
    });
  };

  const deleteFollowup = (id) =>
    setState((s) => ({
      ...s,
      followups: s.followups.filter((f) => f.id !== id),
      tasks: s.tasks.filter((t) => !(t.sourceType === "followup" && t.sourceId === id)),
    }));

  // ------- Calendar exceptions -------
  const addException = (data) => {
    const obj = { id: uid(), ...data };
    setState((s) => ({ ...s, calendarExceptions: [...s.calendarExceptions, obj] }));
    return obj;
  };
  const deleteException = (id) =>
    setState((s) => ({ ...s, calendarExceptions: s.calendarExceptions.filter((e) => e.id !== id) }));

  // ------- Student notes / adaptations / support -------
  const addStudentNote = (data) => {
    const obj = { id: uid(), ...data };
    setState((s) => ({ ...s, studentNotes: [...s.studentNotes, obj] }));
    return obj;
  };
  const deleteStudentNote = (id) =>
    setState((s) => ({ ...s, studentNotes: s.studentNotes.filter((n) => n.id !== id) }));

  const addMeetingNote = (data) => {
    const obj = { id: uid(), ...data };
    setState((s) => ({ ...s, meetingNotes: [...s.meetingNotes, obj] }));
    return obj;
  };
  const deleteMeetingNote = (id) =>
    setState((s) => ({ ...s, meetingNotes: s.meetingNotes.filter((n) => n.id !== id) }));

  const setStudentAdaptation = (studentId, text) =>
    setState((s) => ({ ...s, studentAdaptations: { ...s.studentAdaptations, [studentId]: text } }));
  const setStudentSupport = (studentId, text) =>
    setState((s) => ({ ...s, studentSupport: { ...s.studentSupport, [studentId]: text } }));

  // ------- Meeting templates -------
  const addMeetingTemplate = (data) => {
    const obj = { id: uid(), ...data };
    setState((s) => ({ ...s, meetingTemplates: [...(s.meetingTemplates || []), obj] }));
    return obj;
  };
  const deleteMeetingTemplate = (id) =>
    setState((s) => ({ ...s, meetingTemplates: (s.meetingTemplates || []).filter((t) => t.id !== id) }));

  const dismissSamtalSuggestion = () =>
    setState((s) => ({ ...s, hasSeenSamtalSuggestion: true }));

  const setUserName = (name) =>
    setState((s) => ({ ...s, userName: (name || "").trim() }));

  const setActiveTerm = (term) => setState((s) => ({ ...s, activeTerm: term }));
  const setEveningMode = (mode) => setState((s) => ({ ...s, eveningMode: mode }));

  // Standalone materials + folders
  const addStandaloneMaterial = (data) => {
    const obj = { id: uid(), createdAt: new Date().toISOString(), ...data };
    setState((s) => ({ ...s, standaloneMaterials: [...(s.standaloneMaterials || []), obj] }));
    return obj;
  };
  const updateStandaloneMaterial = (id, patch) =>
    setState((s) => ({ ...s, standaloneMaterials: (s.standaloneMaterials || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const deleteStandaloneMaterial = (id) =>
    setState((s) => ({ ...s, standaloneMaterials: (s.standaloneMaterials || []).filter((m) => m.id !== id) }));

  const moveMaterialToFolder = (ref, subjectId, subcategory) => {
    // ref: { source: 'event'|'standalone', eventId?, materialId, standaloneId? }
    setState((s) => {
      if (ref.source === "event") {
        return {
          ...s,
          events: s.events.map((e) => e.id !== ref.eventId ? e : {
            ...e,
            materials: (e.materials || []).map((m) => m.id === ref.materialId ? { ...m, subjectId: subjectId || null, subcategory: subcategory || "Övrigt" } : m),
          }),
        };
      }
      return {
        ...s,
        standaloneMaterials: (s.standaloneMaterials || []).map((m) => m.id === ref.standaloneId ? { ...m, subjectId: subjectId || null, subcategory: subcategory || "Övrigt" } : m),
      };
    });
  };

  const addCustomSubcategory = (subjectId, name) => {
    const obj = { id: uid(), subjectId: subjectId || null, name: name.trim() };
    setState((s) => ({ ...s, customSubcategories: [...(s.customSubcategories || []), obj] }));
    return obj;
  };
  const deleteCustomSubcategory = (id) =>
    setState((s) => ({ ...s, customSubcategories: (s.customSubcategories || []).filter((c) => c.id !== id) }));

  // ------- Backup -------
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lararplanerare-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importBackup = (data) => {
    setState({ ...emptyState, ...data });
  };
  const clearAll = () => setState(emptyState);

  const value = useMemo(
    () => ({
      ...state,
      addClass, deleteClass, updateClass,
      addSubject, deleteSubject,
      addStudent, deleteStudent,
      addTimetableSlot, deleteTimetableSlot,
      upsertEvent, deleteEvent, toggleEventCompleted,
      addMaterialToEvent, removeMaterialFromEvent, addPrintTaskForMaterial,
      moveEventToDate, copyEventsBetweenDates,
      addUnit, updateUnit, deleteUnit,
      addTask, updateTask, deleteTask, toggleTaskCompleted,
      addFollowup, toggleFollowupCompleted, deleteFollowup,
      addException, deleteException,
      addStudentNote, deleteStudentNote,
      addMeetingNote, deleteMeetingNote,
      setStudentAdaptation, setStudentSupport,
      addMeetingTemplate, deleteMeetingTemplate,
      dismissSamtalSuggestion,
      setUserName,
      setActiveTerm, setEveningMode,
      addStandaloneMaterial, updateStandaloneMaterial, deleteStandaloneMaterial,
      moveMaterialToFolder, addCustomSubcategory, deleteCustomSubcategory,
      exportBackup, importBackup, clearAll,
      update,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
};

export const usePlanner = () => {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used inside PlannerProvider");
  return ctx;
};
