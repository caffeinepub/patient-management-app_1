import Layout from "./Layout";
import PatientProfile from "./pages/PatientProfile";
import Patients from "./pages/Patients";
import Settings from "./pages/Settings";

export const pagesConfig = {
  mainPage: "Patients",
  Pages: {
    Patients: Patients,
    PatientProfile: PatientProfile,
    Settings: Settings,
  },
  Layout: Layout,
};
