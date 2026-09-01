import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { sortTasks } from "@/lib/plannerHelpers";
import { todayISO, formatDateShort, fromISODate } from "@/lib/dateUtils";
import { TASK_CATEGORIES, CATEGORY_STYLES, PRIORITIES, PRIORITY_STYLES } from "@/lib/constants";
import { Plus, Trash2, PanelRightClose, ChevronDown, ChevronUp, Circle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function TodoPanel({ onCollapse }) {
  const { tasks, addTask, deleteTask, toggleTaskCompleted, updateTask } = usePlanner();
  const [quickTitle, setQuickTitle] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [category, setCategory] = useState("Övrigt");
  const [priority, setPriority] = useState("Normal");
  const [deadline, setDeadline] = useState("");

  const sorted = useMemo(() => sortTasks(tasks, todayISO()), [tasks]);
  const activeCount = tasks.filter((t) => !t.completed).length;

  const submit = () => {
    if (!quickTitle.trim()) return;
    addTask({ title: quickTitle.trim(), category, priority, deadline: deadline || null });
    setQuickTitle("");
    setDeadline("");
    setPriority("Normal");
    setCategory("Övrigt");
    setShowAdvanced(false);
  };

  return (
    <aside className="w-80 h-full bg-[#FFFEFB] border-l border-[#DEDAD2] flex flex-col" data-testid="todo-panel">
      <div className="p-5 border-b border-[#DEDAD2] flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Att göra</div>
          <div className="font-serif-display text-xl text-[#293330] mt-0.5">
            {activeCount === 0 ? "Allt är klart" : `${activeCount} kvar`}
          </div>
        </div>
        <button
          data-testid="todo-collapse-btn"
          onClick={onCollapse}
          className="p-1.5 rounded-lg hover:bg-[#EFEAE1] text-[#78817D]"
          title="Fäll ihop"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 border-b border-[#DEDAD2] space-y-2">
        <div className="flex gap-2">
          <Input
            data-testid="todo-quick-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Lägg till uppgift…"
            className="bg-white border-[#DEDAD2]"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button data-testid="todo-quick-add-btn" onClick={submit} size="icon" className="bg-[#718A7F] hover:bg-[#5C7267]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <button
          className="text-xs text-[#78817D] hover:text-[#293330] flex items-center gap-1"
          onClick={() => setShowAdvanced(!showAdvanced)}
          data-testid="todo-advanced-toggle"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Kategori, prioritet & datum
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="todo-category-select" className="bg-white border-[#DEDAD2] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="todo-priority-select" className="bg-white border-[#DEDAD2] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              data-testid="todo-deadline-input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="col-span-2 bg-white border-[#DEDAD2] h-9 text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="todo-list">
        {sorted.length === 0 && (
          <div className="text-center text-sm text-[#A3A69F] py-10 px-4">
            Inga uppgifter ännu. Skapa din första här ovanför.
          </div>
        )}
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={toggleTaskCompleted} onDelete={deleteTask} onUpdate={updateTask} />
        ))}
      </div>
    </aside>
  );
}

const TaskRow = ({ task, onToggle, onDelete, onUpdate }) => {
  const today = todayISO();
  const overdue = task.deadline && !task.completed && task.deadline < today;
  const dueToday = task.deadline === today && !task.completed;
  return (
    <div
      data-testid={`task-item-${task.id}`}
      className={`group rounded-xl border p-3 bg-white transition ${
        task.completed ? "opacity-60 border-[#DEDAD2]" : overdue ? "border-[#DFC6C6] bg-[#FCF2F2]" : "border-[#DEDAD2] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          data-testid={`task-toggle-${task.id}`}
          onClick={() => onToggle(task.id)}
          className="mt-0.5"
          aria-label="Klarmarkera"
        >
          {task.completed ? (
            <CheckCircle2 className="h-4 w-4 text-[#718A7F]" />
          ) : (
            <Circle className="h-4 w-4 text-[#A3A69F]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${task.completed ? "line-through text-[#A3A69F]" : "text-[#293330]"}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${CATEGORY_STYLES[task.category] || CATEGORY_STYLES.Övrigt}`}>
              {task.category}
            </span>
            {task.priority !== "Normal" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority}
              </span>
            )}
            {task.deadline && (
              <span className={`text-[10px] ${overdue ? "text-[#6F3C3C] font-semibold" : dueToday ? "text-[#6B5A2A] font-semibold" : "text-[#A3A69F]"}`}>
                {overdue ? "Försenad · " : dueToday ? "Idag · " : ""}{formatDateShort(fromISODate(task.deadline))}
              </span>
            )}
          </div>
        </div>
        <button
          data-testid={`task-delete-${task.id}`}
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#EFEAE1] text-[#A3A69F]"
          aria-label="Ta bort"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
