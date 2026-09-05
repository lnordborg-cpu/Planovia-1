import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PlanoviaMark } from "@/components/PlanoviaLogo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoggaIn() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/oversikt";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        toast.success("Välkommen tillbaka!");
      } else {
        await register(email.trim(), password, name.trim());
        toast.success("Kontot är skapat");
      }
      navigate("/oversikt");
    } catch (err) {
      setError(err.message || "Något gick fel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#F6F3EE", color: "#293330" }}
      data-testid="page-logga-in"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <PlanoviaMark size={72} />
          <div
            className="mt-4 font-display font-bold tracking-tight"
            style={{ color: "#3B4A44", fontSize: 30, lineHeight: 1 }}
          >
            Planovia
          </div>
          <div className="mt-1.5 text-xs tracking-wide" style={{ color: "#5E6B65" }}>
            Din digitala lärarplanerare
          </div>
          <h1
            className="mt-6 font-display font-semibold tracking-tight text-2xl sm:text-[26px]"
            style={{ color: "#3B4A44", lineHeight: 1.2, maxWidth: 360 }}
            data-testid="loggain-headline"
          >
            Allt för din lärarvardag – samlat på ett ställe.
          </h1>
          <div
            className="mt-4 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em]"
            data-testid="loggain-core-words"
          >
            <span style={{ color: "#718A7F" }}>Samla</span>
            <span style={{ color: "#78817D" }}>·</span>
            <span style={{ color: "#B98B8B" }}>Planera</span>
            <span style={{ color: "#78817D" }}>·</span>
            <span style={{ color: "#B49E6A" }}>Inspirera</span>
          </div>
        </div>

        <div
          className="rounded-3xl border p-8"
          style={{ backgroundColor: "#FFFEFB", borderColor: "#DEDAD2" }}
        >
          <div className="flex mb-6 rounded-xl border p-0.5 text-sm" style={{ borderColor: "#DEDAD2", backgroundColor: "#F6F3EE" }}>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-lg transition ${mode === "login" ? "bg-white font-semibold text-[#293330]" : "text-[#78817D]"}`}
              data-testid="tab-login"
            >Logga in</button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-lg transition ${mode === "register" ? "bg-white font-semibold text-[#293330]" : "text-[#78817D]"}`}
              data-testid="tab-register"
            >Skapa konto</button>
          </div>

          <Button
            type="button"
            onClick={startGoogle}
            variant="outline"
            className="w-full h-11 border-[#DEDAD2] justify-center gap-3 text-[#293330]"
            data-testid="google-login-btn"
          >
            <GoogleIcon />
            Fortsätt med Google
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: "#DEDAD2" }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: "#A3A69F" }}>eller</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#DEDAD2" }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <Label htmlFor="name" className="text-xs">Namn (valfritt)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="T.ex. Lisa"
                  data-testid="auth-name-input"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-xs">E-post</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@exempel.se"
                data-testid="auth-email-input"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Lösenord</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tecken"
                data-testid="auth-password-input"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2 text-sm rounded-lg p-3"
                style={{ backgroundColor: "#FDF2F0", color: "#9E4A3B", border: "1px solid #F5D5D0" }}
                data-testid="auth-error"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 mt-2"
              style={{ backgroundColor: "#718A7F" }}
              data-testid="auth-submit-btn"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ett ögonblick…</>
              ) : mode === "login" ? (
                <><Mail className="h-4 w-4 mr-2" />Logga in</>
              ) : (
                <>Skapa konto <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/oversikt" className="text-sm underline underline-offset-2" style={{ color: "#78817D" }} data-testid="continue-as-guest">
            Fortsätt som gäst
          </Link>
        </div>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.35-1.59-5.06-3.73H.94v2.34A9 9 0 0 0 9 18Z"/>
    <path fill="#FBBC05" d="M3.94 10.7A5.4 5.4 0 0 1 3.66 9c0-.58.1-1.16.28-1.7V4.96H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.04l3-2.34Z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.96l3 2.34C4.65 5.17 6.65 3.58 9 3.58Z"/>
  </svg>
);
