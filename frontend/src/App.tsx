import { Authenticated, Refine } from "@refinedev/core";
// import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools"; // TEMPORALLY DISABLED
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import { authProvider, dataProvider, accessControlProvider } from "@providers/index";
import { ErrorComponent } from "./components/refine-ui/layout/error-component";
import { Layout } from "./components/refine-ui/layout/layout";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { SessionExpiredProvider } from "./contexts/session-expired-context";
import { useTokenRefresh } from "./hooks/use-token-refresh";
import {
  UserCreate,
  UserEdit,
  UserList,
  UserShow,
} from "./pages/users";
import {
  FacultyList,
} from "./pages/faculties";
import { SubjectsList } from "./pages/subjects";
import { ScheduleTimesList } from "./pages/schedule-times";
import { ProfessorList } from "./pages/professors";
import { CoordinationList } from "./pages/coordinations";
import { RecycleBinList } from "./pages/recycle-bin";
import { AcademicLevelsList } from "./pages/academic-levels";
import { HourlyRatesList } from "./pages/hourly-rates";
import { TermsList } from "./pages/terms/list";
import { HolidaysList } from "./pages/holidays";
import { FixedHolidayRulesList } from "./pages/fixed-holiday-rules";
import { AnnualHolidaysList } from "./pages/annual-holidays";
import { AcademicLoadFilesList, AcademicLoadFileShow } from "./pages/academic-load-files";
import { BillingReportShow, ConsolidatedBillingReportShow } from "./pages/billing-reports";
import { DirectorDashboard } from "./pages/director-dashboard";
import { DecanoDashboard } from "./pages/decano-dashboard";
import { ForgotPassword } from "./pages/forgot-password";
import { Login } from "./pages/login";
import { Register } from "./pages/register";

function App() {
  // Inicializar renovación automática de tokens
  useTokenRefresh();

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <TooltipProvider>
            <SessionExpiredProvider>
              {/* <DevtoolsProvider> TEMPORALLY DISABLED */}
              <Refine
                  dataProvider={dataProvider}
                  notificationProvider={useNotificationProvider()}
                  routerProvider={routerProvider}
                  authProvider={authProvider}
                  accessControlProvider={accessControlProvider}
                  resources={[
                    // Top-level resources in order: Academic Planning, then Catalogs
                    {
                      name: "dashboards",
                      meta: { label: "Dashboards", group: true },
                    },
                    {
                      name: "dashboards-director",
                      list: "/director/dashboard",
                      meta: {
                        label: "Dashboard Director",
                        parent: "dashboards",
                        icon: "Activity",
                      },
                    },
                    {
                      name: "dashboards-decano",
                      list: "/decano/dashboard",
                      meta: {
                        label: "Dashboard Decano",
                        parent: "dashboards",
                        icon: "Activity",
                      },
                    },
                    {
                      name: "academic-planning",
                      meta: {
                        label: "Planificación Académica",
                        group: true,
                      },
                    },
                    {
                      name: "academic-load-files",
                      list: "/academic-planning/academic-load-files",
                      meta: {
                        label: "Carga Académica",
                        parent: "academic-planning",
                        icon: "Upload",
                      },
                    },
                    {
                      name: "terms",
                      list: "/academic-planning/terms",
                      meta: {
                        label: "Ciclos Académicos",
                        parent: "academic-planning",
                        icon: "Calendar",
                      },
                    },
                    {
                      name: "holidays",
                      list: "/academic-planning/holidays",
                      meta: {
                        label: "Asuetos del Año",
                        parent: "academic-planning",
                        icon: "CalendarDays",
                      },
                    },
                    {
                      name: "annual-holidays",
                      list: "/academic-planning/annual-holidays/:holidayId",
                      meta: {
                        label: "Asuetos Anuales",
                        parent: "academic-planning",
                        icon: "Calendar",
                        hide: true, // Ocultar del menú principal
                      },
                    },
                    {
                      name: "separator",
                      meta: {
                        group: true,
                        label: "separator",
                      },
                    },
                    {
                      name: "catalogs",
                      meta: {
                        label: "Catálogos",
                        group: true,
                      },
                    },
                    // Catalogs children in required order
                    {
                      name: "users",
                      list: "/users",
                      create: "/users/create",
                      edit: "/users/edit/:id",
                      show: "/users/show/:id",
                      meta: {
                        label: "Usuarios",
                        canDelete: true,
                        parent: "catalogs",
                        icon: "Users",
                      },
                    },
                    {
                      name: "faculty",
                      list: "/faculties",
                      meta: {
                        label: "Facultades y Escuelas",
                        canDelete: true,
                        parent: "catalogs",
                        icon: "GraduationCap",
                      },
                    },
                    {
                      name: "subjects",
                      list: "/catalogs/subjects",
                      meta: {
                        label: "Asignaturas",
                        parent: "catalogs",
                        icon: "BookOpen",
                      },
                    },
                    {
                      name: "professors",
                      list: "/catalogs/professors",
                      meta: {
                        label: "Profesores",
                        parent: "catalogs",
                        icon: "UserCheck",
                      },
                    },
                    {
                      name: "coordinations",
                      list: "/catalogs/coordinations",
                      meta: {
                        label: "Coordinaciones",
                        parent: "catalogs",
                        icon: "Users",
                      },
                    },
                    {
                      name: "schedule-times",
                      list: "/catalogs/schedule-times",
                      meta: {
                        label: "Horarios",
                        parent: "catalogs",
                        icon: "Clock",
                      },
                    },
                    {
                      name: "fixed-holiday-rules",
                      list: "/academic-planning/fixed-holiday-rules",
                      meta: {
                        label: "Asuetos Fijos",
                        parent: "catalogs",
                        icon: "CalendarCheck",
                      },
                    },
                    {
                      name: "separator-config",
                      meta: {
                        group: true,
                        label: "separator",
                      },
                    },
                    {
                      name: "configuration",
                      meta: {
                        label: "Configuración",
                        group: true,
                      },
                    },
                    {
                      name: "academic-levels",
                      list: "/configuration/academic-levels",
                      meta: {
                        label: "Niveles Académicos",
                        parent: "configuration",
                        icon: "GraduationCap",
                      },
                    },
                    {
                      name: "hourly-rates",
                      list: "/configuration/hourly-rates",
                      meta: {
                        label: "Tarifas Horarias",
                        parent: "configuration",
                        icon: "DollarSign",
                      },
                    },
                    {
                      name: "recycle-bin",
                      list: "/configuration/recycle-bin",
                      meta: {
                        label: "Papelera",
                        canDelete: true,
                        parent: "configuration",
                        icon: "Trash2",
                      },
                    },

                  ]}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    projectId: "z38lBH-XJNI10-KyIM9Y",
                    title: {
                      text: "Academics 1.0 | UTEC",
                    },
                  }}
                >
                  <Routes>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-inner"
                          fallback={<CatchAllNavigate to="/login" />}
                        >
                          <Layout>
                            <Outlet />
                          </Layout>
                        </Authenticated>
                      }
                    >
                      <Route
                        index
                        element={<NavigateToResource resource="academic-load-files" />}
                      />
                      <Route path="/users">
                        <Route index element={<UserList />} />
                        <Route path="create" element={<UserCreate />} />
                        <Route path="edit/:id" element={<UserEdit />} />
                        <Route path="show/:id" element={<UserShow />} />
                      </Route>
                      <Route path="/faculties">
                        <Route index element={<FacultyList />} />
                      </Route>
                      <Route path="/catalogs">
                        <Route path="schedule-times" element={<ScheduleTimesList />} />
                        <Route path="subjects" element={<SubjectsList />} />
                        <Route path="professors" element={<ProfessorList />} />
                        <Route path="coordinations" element={<CoordinationList />} />
                      </Route>
                      <Route path="/configuration">
                        <Route path="academic-levels" element={<AcademicLevelsList />} />
                        <Route path="hourly-rates" element={<HourlyRatesList />} />
                        <Route path="recycle-bin" element={<RecycleBinList />} />
                      </Route>
                      <Route path="/academic-planning">
                        <Route path="terms" element={<TermsList />} />
                        <Route path="academic-load-files" element={<AcademicLoadFilesList />} />
                        <Route path="academic-load-files/show/:id" element={<AcademicLoadFileShow />} />
                        <Route path="billing-reports/show/:id" element={<BillingReportShow />} />
                        <Route path="billing-reports/consolidated/:termId" element={<ConsolidatedBillingReportShow />} />
                        <Route path="holidays" element={<HolidaysList />} />
                        <Route path="fixed-holiday-rules" element={<FixedHolidayRulesList />} />
                        <Route path="annual-holidays/:holidayId" element={<AnnualHolidaysList />} />
                      </Route>
                      <Route path="/director">
                        <Route path="dashboard" element={<DirectorDashboard />} />
                      </Route>
                      <Route path="/decano">
                        <Route path="dashboard" element={<DecanoDashboard />} />
                      </Route>
                      <Route path="/billing-reports">
                        <Route path="show/:id" element={<BillingReportShow />} />
                      </Route>
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-outer"
                          fallback={<Outlet />}
                        >
                          <NavigateToResource />
                        </Authenticated>
                      }
                    >
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                    </Route>
                  </Routes>

                  <Toaster />
                  <RefineKbar />
                  <UnsavedChangesNotifier />
                  <DocumentTitleHandler />
                </Refine>
                {/* <DevtoolsPanel /> TEMPORALLY DISABLED */}
              {/* </DevtoolsProvider> TEMPORALLY DISABLED */}
            </SessionExpiredProvider>
          </TooltipProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
