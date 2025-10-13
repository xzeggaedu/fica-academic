import { Authenticated, Refine } from "@refinedev/core";
// import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import "./App.css";
import { authProvider, dataProvider, accessControlProvider } from "./providers";
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
import { ScheduleTimesList } from "./pages/configuration/schedule-times";
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
        {/* <DevtoolsProvider> */}
          <Refine
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              authProvider={authProvider}
              accessControlProvider={accessControlProvider}
              resources={[
                {
                  name: "users",
                  list: "/users",
                  create: "/users/create",
                  edit: "/users/edit/:id",
                  show: "/users/show/:id",
                  meta: {
                    label: "Usuarios",
                    canDelete: true,
                  },
                },
                {
                  name: "faculty",
                  list: "/faculties",
                  meta: {
                    label: "Facultades y Escuelas",
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
                  name: "configuration",
                  meta: {
                    label: "Configuración",
                    group: true,
                  },
                },
                {
                  name: "schedule-times",
                  list: "/configuration/schedule-times",
                  meta: {
                    label: "Horarios",
                    parent: "configuration",
                    icon: "Clock",
                  },
                },
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
                    element={<NavigateToResource resource="users" />}
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
                  <Route path="/configuration">
                    <Route path="schedule-times" element={<ScheduleTimesList />} />
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
            {/* <DevtoolsPanel /> */}
          {/* </DevtoolsProvider> */}
            </SessionExpiredProvider>
          </TooltipProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
