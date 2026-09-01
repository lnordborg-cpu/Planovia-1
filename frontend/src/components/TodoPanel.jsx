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
    <aside className="w-80 h-full bg-[#FAF7F2] border-l border-[#E6E1DA] flex flex-col" data-testid="todo-panel">
      <div className="p-5 border-b border-[#E6E1DA] flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Att göra</div>
          <div className="font-serif-display text-xl text-[#2D312E] mt-0.5">
            {activeCount === 0 ? "Allt är klart" : `${activeCount} kvar`}
          </div>
        </div>
        <button
          data-testid="todo-collapse-btn"
          onClick={onCollapse}
          className="p-1.5 rounded-lg hover:bg-[#F3EFEA] text-[#656E67]"
          title="Fäll ihop"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 border-b border-[#E6E1DA] space-y-2">
        <div className="flex gap-2">
          <Input
            data-testid="todo-quick-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Lägg till uppgift…"
            className="bg-white border-[#E6E1DA]"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button data-testid="todo-quick-add-btn" onClick={submit} size="icon" className="bg-[#3D5A45] hover:bg-[#2F4736]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <button
          className="text-xs text-[#656E67] hover:text-[#2D312E] flex items-center gap-1"
          onClick={() => setShowAdvanced(!showAdvanced)}
          data-testid="todo-advanced-toggle"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Kategori, prioritet & datum
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="todo-category-select" className="bg-white border-[#E6E1DA] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="todo-priority-select" className="bg-white border-[#E6E1DA] h-9 text-xs">
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
              className="col-span-2 bg-white border-[#E6E1DA] h-9 text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="todo-list">
        {sorted.length === 0 && (
          <div className="text-center text-sm text-[#8A948C] py-10 px-4">
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
        task.completed ? "opacity-60 border-[#E6E1DA]" : overdue ? "border-[#F5D5D0] bg-[#FDF7F5]" : "border-[#E6E1DA] hover:shadow-sm"
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
            <CheckCircle2 className="h-4 w-4 text-[#3D5A45]" />
          ) : (
            <Circle className="h-4 w-4 text-[#8A948C]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${task.completed ? "line-through text-[#8A948C]" : "text-[#2D312E]"}`}>
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
              <span className={`text-[10px] ${overdue ? "text-[#9E4A3B] font-semibold" : dueToday ? "text-[#8C5E14] font-semibold" : "text-[#8A948C]"}`}>
                {overdue ? "Försenad · " : dueToday ? "Idag · " : ""}{formatDateShort(fromISODate(task.deadline))}
              </span>
            )}
          </div>
        </div>
        <button
          data-testid={`task-delete-${task.id}`}
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F3EFEA] text-[#8A948C]"
          aria-label="Ta bort"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
