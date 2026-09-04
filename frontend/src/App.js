import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { PlannerProvider, usePlanner } from "@/context/PlannerContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import CloudSync from "@/components/CloudSync";
import Oversikt from "@/pages/Oversikt";
import LasarTermin from "@/pages/LasarTermin";
import Veckoplanering from "@/pages/Veckoplanering";
import Elevkort from "@/pages/Elevkort";
import Material from "@/pages/Material";
import Statistik from "@/pages/Statistik";
import Installningar from "@/pages/Installningar";
import Valkommen from "@/pages/Valkommen";
import LoggaIn from "@/pages/LoggaIn";
import AuthCallback from "@/pages/AuthCallback";

const RootRedirect = () => {
  const planner = usePlanner();
  return <Navigate to={planner.hasSeenWelcome ? "/oversikt" : "/valkommen"} replace />;
};

// Renders AuthCallback whenever the URL fragment contains an OAuth session_id,
// regardless of the current path. Otherwise renders the normal routes.
const Router = () => {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/valkommen" element={<Valkommen />} />
      <Route path="/logga-in" element={<LoggaIn />} />
      <Route element={<Layout />}>
        <Route path="/oversikt" element={<Oversikt />} />
        <Route path="/lasar" element={<LasarTermin />} />
        <Route path="/vecka" element={<Veckoplanering />} />
        <Route path="/elever" element={<Elevkort />} />
        <Route path="/elever/:studentId" element={<Elevkort />} />
        <Route path="/material" element={<Material />} />
        <Route path="/statistik" element={<Statistik />} />
        <Route path="/installningar" element={<Installningar />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <PlannerProvider>
      <AuthProvider>
        <BrowserRouter>
          <CloudSync />
          <Router />
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </PlannerProvider>
  );
}

export default App;
