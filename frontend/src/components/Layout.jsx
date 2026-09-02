import React, { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarRange, CalendarDays, Users, Folder, Settings, PanelRightClose, PanelRightOpen, Search, BarChart3, Moon, Sun } from "lucide-react";
import TodoPanel from "@/components/TodoPanel";
import GlobalSearch from "@/components/GlobalSearch";
import QuickNote from "@/components/QuickNote";
import { usePlanner } from "@/context/PlannerContext";
import { TERMS, inferCurrentTerm } from "@/lib/constants";

const NAV_ITEMS = [
  { to: "/oversikt", label: "Översikt", icon: LayoutDashboard, testId: "nav-oversikt" },
  { to: "/lasar", label: "Läsår / Termin", icon: CalendarRange, testId: "nav-lasar" },
  { to: "/vecka", label: "Veckoplanering", icon: CalendarDays, testId: "nav-vecka" },
  { to: "/elever", label: "Elevkort", icon: Users, testId: "nav-elever" },
  { to: "/material", label: "Material", icon: Folder, testId: "nav-material" },
  { to: "/statistik", label: "Statistik", icon: BarChart3, testId: "nav-statistik" },
  { to: "/installningar", label: "Inställningar", icon: Settings, testId: "nav-installningar" },
];

const Sidebar = () => (
  <aside className="w-60 flex-shrink-0 bg-[#EFEAE1] border-r border-[#DEDAD2] flex flex-col p-4" data-testid="sidebar">
    <div className="px-2 pt-5 pb-6">
      <div className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded-lg bg-[#DFE9E2] border border-[#C7D6CB]" aria-hidden="true" />
        <div className="font-display text-2xl leading-none text-[#293330] tracking-tight font-bold">Planova</div>
      </div>
    </div>
    <nav className="flex flex-col gap-0.5 flex-1">
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
                  ? "bg-[#DFE9E2] text-[#293330] font-semibold"
                  : "text-[#78817D] hover:bg-white/60 hover:text-[#293330]"
              }`
            }
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
    <div className="text-[11px] text-[#A3A69F] px-3 py-2 leading-relaxed">
      All data sparas lokalt i din webbläsare.
    </div>
  </aside>
);

export default function Layout() {
  const planner = usePlanner();
  const [todoOpen, setTodoOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeTermId = planner.activeTerm === "auto" ? inferCurrentTerm() : planner.activeTerm;
  const isEveningActive = React.useMemo(() => {
    if (planner.eveningMode === "on") return true;
    if (planner.eveningMode === "off") return false;
    const h = new Date().getHours();
    return h >= 20 || h < 5;
  }, [planner.eveningMode]);

  useEffect(() => {
    document.body.classList.toggle("evening-mode", isEveningActive);
    return () => document.body.classList.remove("evening-mode");
  }, [isEveningActive]);

  useEffect(() => {
    if (planner.eveningMode !== "auto") return;
    const iv = setInterval(() => {
      const h = new Date().getHours();
      const should = h >= 20 || h < 5;
      document.body.classList.toggle("evening-mode", should);
    }, 60 * 1000);
    return () => clearInterval(iv);
  }, [planner.eveningMode]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F6F3EE] text-[#293330]">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 pt-6 pb-2 flex items-center gap-3 no-print">
          <div className="inline-flex rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-0.5 text-xs" data-testid="term-selector">
            {["ht", "vt"].map((k) => (
              <button
                key={k}
                data-testid={`term-${k}`}
                onClick={() => planner.setActiveTerm(k)}
                className={`px-3 py-1.5 rounded-lg transition ${activeTermId === k ? "bg-[#DFE9E2] text-[#293330] font-semibold" : "text-[#78817D] hover:text-[#293330]"}`}
                title={TERMS[k].label}
              >{TERMS[k].short}</button>
            ))}
            {planner.activeTerm !== "auto" && (
              <button
                data-testid="term-auto"
                onClick={() => planner.setActiveTerm("auto")}
                className="px-2 py-1.5 rounded-lg text-[10px] text-[#78817D] hover:text-[#293330]"
                title="Följ dagens datum"
              >auto</button>
            )}
          </div>
          <button
            data-testid="evening-toggle"
            onClick={() => planner.setEveningMode(isEveningActive ? "off" : "on")}
            className="h-8 w-8 rounded-lg border border-[#DEDAD2] bg-[#FFFEFB] flex items-center justify-center text-[#78817D] hover:text-[#293330]"
            title={isEveningActive ? "Avsluta kvällsläge" : "Kvällsläge"}
          >
            {isEveningActive ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex-1" />
          <button
            data-testid="global-search-btn"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-sm text-[#78817D] bg-white border border-[#DEDAD2] rounded-xl pl-3 pr-2 py-1.5 min-w-[280px] hover:border-[#718A7F] transition"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Sök i planeraren…</span>
            <kbd className="text-[10px] font-mono bg-[#EFEAE1] text-[#78817D] px-1.5 py-0.5 rounded border border-[#DEDAD2]">⌘K</kbd>
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-8 pb-8">
          <Outlet />
        </div>
      </main>
      <div className="flex-shrink-0 relative no-print">
        {todoOpen ? (
          <TodoPanel onCollapse={() => setTodoOpen(false)} />
        ) : (
          <button
            data-testid="todo-expand-btn"
            onClick={() => setTodoOpen(true)}
            className="h-full w-10 bg-[#FFFEFB] border-l border-[#DEDAD2] flex flex-col items-center justify-start pt-6 gap-2 hover:bg-[#EFEAE1] transition"
            title="Öppna Att göra"
          >
            <PanelRightOpen className="h-4 w-4 text-[#78817D]" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-xs tracking-widest text-[#78817D] mt-2">ATT GÖRA</span>
          </button>
        )}
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickNote offsetRight={todoOpen ? "21rem" : "3.5rem"} />
    </div>
  );
}

export { PanelRightClose };
