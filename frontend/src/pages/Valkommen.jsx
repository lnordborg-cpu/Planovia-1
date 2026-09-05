import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanner } from "@/context/PlannerContext";
import { PlanoviaMark } from "@/components/PlanoviaLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, LogIn } from "lucide-react";

const WORDMARK = "#3B4A44";
const TAGLINE = "#5E6B65";
const BODY = "#4B5651";
const MUTED = "#78817D";
const BG = "#F6F3EE";
const CARD = "#FFFEFB";
const BORDER = "#DEDAD2";

const CORE_SAMLA = "#718A7F";
const CORE_PLANERA = "#B98B8B";
const CORE_INSPIRERA = "#B49E6A";

export default function Valkommen() {
  const navigate = useNavigate();
  const planner = usePlanner();

  useEffect(() => {
    document.title = "Planovia – Din digitala lärarplanerare";
  }, []);

  const start = () => {
    if (planner.update) planner.update({ hasSeenWelcome: true });
    navigate("/oversikt");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-14"
      style={{ backgroundColor: BG, color: "#293330" }}
      data-testid="page-valkommen"
    >
      <div className="w-full max-w-2xl">
        <div
          className="rounded-3xl border px-8 py-14 sm:px-14 sm:py-16 flex flex-col items-center text-center"
          style={{ backgroundColor: CARD, borderColor: BORDER }}
        >
          {/* Brand lockup */}
          <PlanoviaMark size={120} />

          <div
            className="mt-6 font-display font-bold tracking-tight"
            style={{ color: WORDMARK, fontSize: 46, lineHeight: 1 }}
            data-testid="valkommen-brand"
          >
            Planovia
          </div>
          <div
            className="mt-3 text-sm tracking-wide"
            style={{ color: TAGLINE }}
            data-testid="valkommen-tagline"
          >
            Din digitala lärarplanerare
          </div>

          {/* Hero headline */}
          <h1
            className="mt-10 font-display font-semibold tracking-tight text-3xl sm:text-4xl lg:text-[42px]"
            style={{ color: WORDMARK, lineHeight: 1.15, maxWidth: 620 }}
            data-testid="valkommen-headline"
          >
            Allt för din lärarvardag – samlat på ett ställe.
          </h1>

          {/* Supporting text */}
          <p
            className="mt-6 text-[15px] sm:text-base leading-relaxed"
            style={{ color: BODY, maxWidth: 560 }}
            data-testid="valkommen-intro"
          >
            Planera undervisningen, samla reflektioner och behåll överblicken.
            Planovia kopplar samman din planering så att informationen finns
            där du behöver den – från läsår och vecka till dagens lektion.
          </p>

          {/* Core words */}
          <div
            className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em]"
            data-testid="valkommen-core-words"
          >
            <span style={{ color: CORE_SAMLA }}>Samla</span>
            <span style={{ color: MUTED }}>·</span>
            <span style={{ color: CORE_PLANERA }}>Planera</span>
            <span style={{ color: MUTED }}>·</span>
            <span style={{ color: CORE_INSPIRERA }}>Inspirera</span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={start}
              className="h-11 px-6 rounded-xl text-[15px]"
              style={{ backgroundColor: CORE_SAMLA }}
              data-testid="valkommen-start-btn"
            >
              Kom igång
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/logga-in")}
              className="h-11 px-5 rounded-xl text-[15px]"
              style={{ borderColor: BORDER, color: WORDMARK }}
              data-testid="valkommen-login-btn"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Logga in
            </Button>
          </div>

          <span className="text-xs mt-4" style={{ color: "#A3A69F" }}>
            Ingen registrering krävs för att prova – din data sparas lokalt.
          </span>
        </div>

        <div
          className="text-center text-[11px] tracking-[0.2em] uppercase mt-6"
          style={{ color: "#A3A69F" }}
        >
          Planovia · v1
        </div>
      </div>
    </div>
  );
}
