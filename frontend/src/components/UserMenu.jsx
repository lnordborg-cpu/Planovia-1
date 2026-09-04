import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

const initialsFor = (name, email) => {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+|@/).filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
};

export default function UserMenu({ collapsed = false }) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    // Guest state – show login CTA
    if (collapsed) {
      return (
        <Link
          to="/logga-in"
          className="mx-auto h-9 w-9 rounded-lg flex items-center justify-center text-[#78817D] hover:text-[#293330] hover:bg-white/60"
          title="Logga in för att synka"
          data-testid="user-menu-login-icon"
        >
          <LogIn className="h-4 w-4" />
        </Link>
      );
    }
    return (
      <Link
        to="/logga-in"
        className="flex items-center gap-2 rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] px-3 py-2 text-sm hover:bg-white transition"
        data-testid="user-menu-login"
      >
        <LogIn className="h-4 w-4 text-[#718A7F]" />
        <div className="flex-1">
          <div className="font-semibold text-[#293330]">Logga in</div>
          <div className="text-[10px] text-[#A3A69F]">Synka mellan enheter</div>
        </div>
      </Link>
    );
  }

  const initials = initialsFor(user.name, user.email);

  const doLogout = async () => {
    await logout();
    navigate("/logga-in");
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: "#DFE9E2", color: "#47594E" }}
          title={user.name || user.email}
          data-testid="user-menu-avatar"
        >
          {user.picture ? (
            <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : initials}
        </div>
        <button
          onClick={doLogout}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-[#78817D] hover:text-[#9E4A3B] hover:bg-white/60"
          title="Logga ut"
          data-testid="user-menu-logout-icon"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-2.5 flex items-center gap-2.5" data-testid="user-menu">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
        style={{ backgroundColor: "#DFE9E2", color: "#47594E" }}
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[#293330] truncate">{user.name || user.email.split("@")[0]}</div>
        <div className="text-[10px] text-[#A3A69F] truncate">{user.email}</div>
      </div>
      <button
        onClick={doLogout}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#78817D] hover:text-[#9E4A3B] hover:bg-[#FDF2F0]"
        title="Logga ut"
        data-testid="user-menu-logout"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
