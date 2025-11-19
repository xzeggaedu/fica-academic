import { useCustom, CanAccess } from "@refinedev/core";
import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  AlertTriangle,
  Code2,
} from "lucide-react";
import { Unauthorized } from "../unauthorized";
import { API_BASE_URL, API_BASE_PATH } from "@/providers/dataProvider";

interface UpdateCheckResponse {
  has_updates: boolean;
  backend_update_available: boolean;
  frontend_update_available: boolean;
  backend_current_digest: string | null;
  backend_remote_digest: string | null;
  frontend_current_digest: string | null;
  frontend_remote_digest: string | null;
  message: string;
}

interface UpdateStatusResponse {
  status: string;
  message: string;
  progress: any;
  error: string | null;
}

// Helper function to detect development environment
const isDevelopmentEnvironment = (): boolean => {
  // Check if running in Vite dev mode
  if (import.meta.env.DEV) {
    return true;
  }

  // Check hostname for localhost
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
      return true;
    }
  }

  // Check environment variable
  if (import.meta.env.VITE_DEBUG_MODE === "true") {
    return true;
  }

  return false;
};

export const SystemUpdate = () => {
  const isDevelopment = useMemo(() => isDevelopmentEnvironment(), []);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [developmentWarningOpen, setDevelopmentWarningOpen] = useState(false);

  const { refetch: checkUpdates, data: checkData } = useCustom<UpdateCheckResponse>({
    url: `${API_BASE_PATH}/system/update/check`,
    method: "get",
    config: {
      enabled: false,
    },
    queryOptions: {
      onSuccess: (data) => {
        setUpdateInfo(data.data);
        setChecking(false);
        toast.success("Verificación completada");
      },
      onError: (error: any) => {
        setChecking(false);
        toast.error(
          error?.response?.data?.detail || "Error al verificar actualizaciones"
        );
      },
    },
  });

  const { data: statusData, refetch: refetchStatus } = useCustom<UpdateStatusResponse>({
    url: `${API_BASE_PATH}/system/update/status`,
    method: "get",
    config: {
      enabled: false,
    },
  });

  const { mutate: triggerUpdate, isPending: isTriggering } = useCustom({
    url: `${API_BASE_PATH}/system/update/trigger`,
    method: "post",
    config: {
      payload: {
        create_backup: true,
        run_migrations: true,
      },
    },
    mutationOptions: {
      onSuccess: (data) => {
        setUpdateStatus(data.data);
        setUpdating(true);
        setConfirmDialogOpen(false);
        toast.info("Actualización iniciada en segundo plano");
        startStatusPolling();
      },
      onError: (error: any) => {
        setUpdating(false);
        setConfirmDialogOpen(false);
        toast.error(
          error?.response?.data?.detail || "Error al iniciar la actualización"
        );
      },
    },
  });

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${API_BASE_PATH}/system/update/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("fica-access-token")}`,
          },
        });
        const data = await response.json();
        setUpdateStatus(data);

        if (data.status === "completed") {
          clearInterval(interval);
          setUpdating(false);
          toast.success("Actualización completada exitosamente");
          setTimeout(() => {
            handleCheckUpdates();
          }, 2000);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setUpdating(false);
          toast.error(`Actualización falló: ${data.error || data.message}`);
        }
      } catch (error) {
        clearInterval(interval);
        setUpdating(false);
        toast.error("Error al consultar el estado de la actualización");
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      if (updating) {
        setUpdating(false);
        toast.warning("Timeout al esperar actualización");
      }
    }, 30 * 60 * 1000);
  };

  const handleCheckUpdates = () => {
    // Bloquear en entorno de desarrollo
    if (isDevelopment) {
      setDevelopmentWarningOpen(true);
      return;
    }

    setChecking(true);
    setUpdateInfo(null);
    checkUpdates();
  };

  const handleTriggerUpdate = () => {
    // Bloquear en entorno de desarrollo
    if (isDevelopment) {
      setDevelopmentWarningOpen(true);
      return;
    }

    setConfirmDialogOpen(true);
  };

  const confirmUpdate = () => {
    triggerUpdate();
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "updating":
      case "checking":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      case "updating":
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <CanAccess
      resource="system-update"
      action="list"
      fallback={
        <Unauthorized
          resourceName="Actualización del Sistema"
          message="Solo los administradores pueden acceder a la actualización del sistema."
        />
      }
    >
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Actualización del Sistema</CardTitle>
          <CardDescription>
            Verifica y aplica actualizaciones del sistema desde GitHub Container Registry.
            Solo usuarios administradores pueden realizar esta acción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              onClick={handleCheckUpdates}
              disabled={checking || updating}
              size="lg"
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar Actualizaciones
                </>
              )}
            </Button>
          </div>

          {updateInfo && (
            <div className="space-y-4">
              {updateInfo.has_updates ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Actualizaciones Disponibles</AlertTitle>
                  <AlertDescription className="space-y-4">
                    <p>Se encontraron nuevas versiones disponibles en el registro:</p>
                    <div className="space-y-2">
                      {updateInfo.backend_update_available && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Backend</Badge>
                          <span className="text-sm">Nueva versión disponible</span>
                        </div>
                      )}
                      {updateInfo.frontend_update_available && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Frontend</Badge>
                          <span className="text-sm">Nueva versión disponible</span>
                        </div>
                      )}
                    </div>
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Advertencia</AlertTitle>
                      <AlertDescription>
                        La actualización puede causar un breve período de inactividad.
                        Se creará un backup automático antes de aplicar los cambios.
                      </AlertDescription>
                    </Alert>
                    <div className="pt-2">
                      <Button
                        onClick={handleTriggerUpdate}
                        disabled={isTriggering || updating}
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        {isTriggering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Iniciando...
                          </>
                        ) : (
                          "Aplicar Actualización"
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Sistema Actualizado</AlertTitle>
                  <AlertDescription>
                    No hay actualizaciones disponibles. El sistema está en la última versión.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {updating && updateStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(updateStatus.status)}
                  Estado de Actualización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(updateStatus.status)}>
                    {updateStatus.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{updateStatus.message}</p>
                  {updateStatus.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{updateStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
                {updateStatus.status === "updating" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Actualizando sistema...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {updateInfo && !updateInfo.has_updates && (
            <Card>
              <CardHeader>
                <CardTitle>Información de Versiones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Backend:</span>
                    <span className="text-muted-foreground">
                      {updateInfo.backend_current_digest
                        ? updateInfo.backend_current_digest.substring(0, 20) + "..."
                        : "No disponible"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Frontend:</span>
                    <span className="text-muted-foreground">
                      {updateInfo.frontend_current_digest
                        ? updateInfo.frontend_current_digest.substring(0, 20) + "..."
                        : "No disponible"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Actualización</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea actualizar el sistema?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Esta acción:</AlertTitle>
              <AlertDescription className="space-y-1 mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Creará un backup automático de la base de datos</li>
                  <li>Descargará las nuevas imágenes desde GHCR</li>
                  <li>Actualizará los contenedores</li>
                  <li>Ejecutará las migraciones de base de datos si es necesario</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Advertencia</AlertTitle>
              <AlertDescription>
                El sistema puede estar temporalmente no disponible durante la actualización.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isTriggering}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmUpdate}
              disabled={isTriggering}
            >
              {isTriggering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                "Confirmar Actualización"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={developmentWarningOpen} onOpenChange={setDevelopmentWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Actualización no Disponible en Desarrollo
            </DialogTitle>
            <DialogDescription>
              No es posible actualizar el sistema en el entorno de desarrollo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                Entorno de Desarrollo Detectado
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300 mt-2 space-y-2">
                <p>
                  La funcionalidad de actualización del sistema solo está disponible en entornos de producción.
                </p>
                <p>
                  En el entorno de desarrollo (localhost), las actualizaciones deben realizarse manualmente:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                  <li>Usando <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">git pull</code> para obtener los cambios</li>
                  <li>Reconstruyendo las imágenes Docker si es necesario</li>
                  <li>Reiniciando los servicios manualmente</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDevelopmentWarningOpen(false)}
              className="w-full sm:w-auto"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </CanAccess>
  );
};
