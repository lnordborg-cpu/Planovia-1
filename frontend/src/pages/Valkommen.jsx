import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanner } from "@/context/PlannerContext";
import { PlanoviaFull } from "@/components/PlanoviaLogo";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Sparkles, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    color: "#8FA69A",
    tint: "#DFE9E2",
    title: "Samla",
    body: "Klasser, ämnen, elever och schema på ett lugnt ställe. Skriv en gång – syns överallt.",
  },
  {
    icon: Sparkles,
    color: "#B98B8B",
    tint: "#EEDDDD",
    title: "Planera",
    body: "Veckoplanering med drag & släpp, arbetsområden och material – utan att tappa fokus.",
  },
  {
    icon: Users,
    color: "#B49E6A",
    tint: "#F2E8C8",
    title: "Inspirera",
    body: "Reflektera över dina dagar, se trender och firar små milstolpar i vardagen.",
  },
];

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
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#F6F3EE", color: "#293330" }}
      data-testid="page-valkommen"
    >
      <div className="w-full max-w-3xl">
        <div
          className="rounded-3xl border p-10 sm:p-14 flex flex-col items-center"
          style={{ backgroundColor: "#FFFEFB", borderColor: "#DEDAD2" }}
        >
          <PlanoviaFull iconSize={92} />

          <p
            className="mt-8 text-center max-w-lg text-[15px] leading-relaxed"
            style={{ color: "#5E6B65" }}
            data-testid="valkommen-intro"
          >
            En lugn plats för dig som lärare att samla vardagen, planera nästa vecka och
            fånga små reflektioner. Skandinavisk enkelhet, allt på svenska.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-3 w-full">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border p-4 text-left"
                  style={{ borderColor: "#DEDAD2", backgroundColor: "#FFFEFB" }}
                  data-testid={`valkommen-feature-${f.title.toLowerCase()}`}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: f.tint, color: f.color }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="font-serif-display text-lg" style={{ color: "#293330" }}>
                    {f.title}
                  </div>
                  <div className="text-xs mt-1 leading-relaxed" style={{ color: "#78817D" }}>
                    {f.body}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={start}
              className="h-11 px-6 rounded-xl text-[15px]"
              style={{ backgroundColor: "#718A7F" }}
              data-testid="valkommen-start-btn"
            >
              Kom igång
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <span className="text-xs" style={{ color: "#A3A69F" }}>
              Ingen registrering nu – din data sparas lokalt.
            </span>
          </div>
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
