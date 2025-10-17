import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
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
  TaskCreate,
  TaskList,
  TaskShow,
} from "./pages/tasks";
import {
  FacultyList,
} from "./pages/faculties";
import { CoursesList } from "./pages/courses";
import { ScheduleTimesList } from "./pages/schedule-times";
import { ProfessorList } from "./pages/professors";
import { CoordinationList } from "./pages/coordinations";
import { RecycleBinList } from "./pages/recycle-bin";
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
              <DevtoolsProvider>
                <Refine
                  dataProvider={dataProvider}
                  notificationProvider={useNotificationProvider()}
                  routerProvider={routerProvider}
                  authProvider={authProvider}
                  accessControlProvider={accessControlProvider}
                  resources={[
                    // Top-level resources in order: Tasks, then Catalogs
                    {
                      name: "tasks",
                      list: "/tasks",
                      create: "/tasks/create",
                      show: "/tasks/show/:id",
                      meta: {
                        label: "Tareas",
                        canDelete: true,
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
                      name: "courses",
                      list: "/catalogs/courses",
                      meta: {
                        label: "Asignaturas",
                        parent: "catalogs",
                        icon: "BookOpen",
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
                      name: "recycle-bin",
                      list: "/recycle-bin",
                      meta: {
                        label: "Papelera",
                        canDelete: true,
                        parent: "catalogs",
                        icon: "Trash2",
                      },
                    },

                  ]}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    projectId: "z38lBH-XJNI10-KyIM9Y",
                    title: {
                      text: "Fica Academics 1.0",
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
                        element={<NavigateToResource resource="tasks" />}
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
                      <Route path="/tasks">
                        <Route index element={<TaskList />} />
                        <Route path="create" element={<TaskCreate />} />
                        <Route path="show/:id" element={<TaskShow />} />
                      </Route>
                      <Route path="/catalogs">
                        <Route path="schedule-times" element={<ScheduleTimesList />} />
                        <Route path="courses" element={<CoursesList />} />
                        <Route path="professors" element={<ProfessorList />} />
                        <Route path="coordinations" element={<CoordinationList />} />
                      </Route>
                      <Route path="/recycle-bin">
                        <Route index element={<RecycleBinList />} />
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
                <DevtoolsPanel />
              </DevtoolsProvider>
            </SessionExpiredProvider>
          </TooltipProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
