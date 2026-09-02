import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { PlannerProvider, usePlanner } from "@/context/PlannerContext";
import Layout from "@/components/Layout";
import Oversikt from "@/pages/Oversikt";
import LasarTermin from "@/pages/LasarTermin";
import Veckoplanering from "@/pages/Veckoplanering";
import Elevkort from "@/pages/Elevkort";
import Material from "@/pages/Material";
import Statistik from "@/pages/Statistik";
import Installningar from "@/pages/Installningar";
import Valkommen from "@/pages/Valkommen";

const RootRedirect = () => {
  const planner = usePlanner();
  return <Navigate to={planner.hasSeenWelcome ? "/oversikt" : "/valkommen"} replace />;
};

function App() {
  return (
    <PlannerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/valkommen" element={<Valkommen />} />
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
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </PlannerProvider>
  );
}

export default App;
