import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarRange, CalendarDays, Users, Folder, Settings, PanelRightClose, PanelRightOpen } from "lucide-react";
import TodoPanel from "@/components/TodoPanel";

const NAV_ITEMS = [
  { to: "/oversikt", label: "Översikt", icon: LayoutDashboard, testId: "nav-oversikt" },
  { to: "/lasar", label: "Läsår / Termin", icon: CalendarRange, testId: "nav-lasar" },
  { to: "/vecka", label: "Veckoplanering", icon: CalendarDays, testId: "nav-vecka" },
  { to: "/elever", label: "Elevkort", icon: Users, testId: "nav-elever" },
  { to: "/material", label: "Material", icon: Folder, testId: "nav-material" },
  { to: "/installningar", label: "Inställningar", icon: Settings, testId: "nav-installningar" },
];

const Sidebar = () => (
  <aside className="w-60 flex-shrink-0 bg-[#F3EFEA] border-r border-[#E6E1DA] flex flex-col p-4" data-testid="sidebar">
    <div className="px-2 py-4 mb-4">
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Lärarplaneraren</div>
      <div className="font-serif-display text-2xl leading-tight text-[#2D312E] mt-1">Din lugna vy</div>
    </div>
    <nav className="flex flex-col gap-1 flex-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-white text-[#2D312E] shadow-sm border border-[#E6E1DA]"
                  : "text-[#656E67] hover:bg-white/60"
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
    <div className="text-[11px] text-[#8A948C] px-3 py-2">
      All data sparas lokalt i din webbläsare.
    </div>
  </aside>
);

export default function Layout() {
  const [todoOpen, setTodoOpen] = useState(true);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF8F5] text-[#2D312E]">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
      <div className="flex-shrink-0 relative">
        {todoOpen ? (
          <TodoPanel onCollapse={() => setTodoOpen(false)} />
        ) : (
          <button
            data-testid="todo-expand-btn"
            onClick={() => setTodoOpen(true)}
            className="h-full w-10 bg-[#FAF7F2] border-l border-[#E6E1DA] flex flex-col items-center justify-start pt-6 gap-2 hover:bg-[#F3EFEA] transition"
            title="Öppna Att göra"
          >
            <PanelRightOpen className="h-4 w-4 text-[#656E67]" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-xs tracking-widest text-[#656E67] mt-2">ATT GÖRA</span>
          </button>
        )}
      </div>
    </div>
  );
}

export { PanelRightClose };
