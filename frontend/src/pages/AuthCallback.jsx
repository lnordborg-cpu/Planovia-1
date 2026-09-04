import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlanoviaMark } from "@/components/PlanoviaLogo";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/**
 * Rendered when the URL has #session_id=… (the Emergent OAuth redirect).
 * Exchanges the fragment for a Planovia session cookie and forwards to /oversikt.
 */
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { finishGoogleLogin } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/logga-in", { replace: true }); return; }
    const sessionId = decodeURIComponent(m[1]);

    (async () => {
      try {
        await finishGoogleLogin(sessionId);
        // Clean the URL and go to dashboard
        window.history.replaceState({}, "", "/oversikt");
        navigate("/oversikt", { replace: true });
        toast.success("Inloggad med Google");
      } catch (err) {
        toast.error(err.message || "Kunde inte slutföra inloggningen");
        navigate("/logga-in", { replace: true });
      }
    })();
  }, [finishGoogleLogin, location.hash, navigate]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "#F6F3EE", color: "#293330" }}
      data-testid="page-auth-callback"
    >
      <PlanoviaMark size={64} />
      <div className="text-sm" style={{ color: "#78817D" }}>Slutför inloggning…</div>
    </div>
  );
}
