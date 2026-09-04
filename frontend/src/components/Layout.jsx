import React, { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarRange, CalendarDays, Users, Folder, Settings, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen, Search, BarChart3, Moon, Sun } from "lucide-react";
import TodoPanel from "@/components/TodoPanel";
import GlobalSearch from "@/components/GlobalSearch";
import QuickNote from "@/components/QuickNote";
import { PlanoviaMark } from "@/components/PlanoviaLogo";
import UserMenu from "@/components/UserMenu";
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

const Sidebar = ({ collapsed, onToggle }) => (
  <aside
    className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 bg-[#EFEAE1] border-r border-[#DEDAD2] flex flex-col p-3 transition-[width] duration-200`}
    data-testid="sidebar"
    data-collapsed={collapsed ? "true" : "false"}
  >
    <div className={`${collapsed ? "px-0" : "px-2"} pt-4 pb-4`} data-testid="sidebar-brand">
      {collapsed ? (
        <div className="flex justify-center">
          <PlanoviaMark size={32} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <PlanoviaMark size={30} />
            <span className="font-display text-2xl leading-none tracking-tight font-bold" style={{ color: "#3B4A44" }}>
              Planovia
            </span>
          </div>
          <div className="mt-2 pl-[38px] text-[11px] tracking-wide" style={{ color: "#5E6B65" }}>
            Din digitala lärarplanerare
          </div>
        </>
      )}
    </div>

    <button
      type="button"
      onClick={onToggle}
      className={`${collapsed ? "mx-auto" : "self-end mr-1"} h-7 w-7 rounded-lg flex items-center justify-center text-[#78817D] hover:text-[#293330] hover:bg-white/60 transition mb-2`}
      title={collapsed ? "Öppna sidebar" : "Fäll ihop sidebar"}
      data-testid="sidebar-toggle"
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </button>

    <nav className="flex flex-col gap-0.5 flex-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-[#DFE9E2] text-[#293330] font-semibold"
                  : "text-[#78817D] hover:bg-white/60 hover:text-[#293330]"
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
    {!collapsed ? (
      <div className="space-y-2 mt-2">
        <UserMenu />
      </div>
    ) : (
      <div className="mt-2 flex flex-col items-center">
        <UserMenu collapsed />
      </div>
    )}
  </aside>
);

export default function Layout() {
  const planner = usePlanner();
  const [todoOpen, setTodoOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const sidebarCollapsed = !!planner.sidebarCollapsed;
  const toggleSidebar = () => planner.update && planner.update({ sidebarCollapsed: !sidebarCollapsed });

  // Auto-collapse on narrow screens (< 1024px) if user hasn't chosen otherwise this session
  useEffect(() => {
    const apply = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 1024 && !sidebarCollapsed) {
        planner.update && planner.update({ sidebarCollapsed: true });
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
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
