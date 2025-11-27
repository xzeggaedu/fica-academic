import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UnauthorizedProps {
  resourceName?: string;
  message?: string;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({
  resourceName = "esta página",
  message = "Solo los administradores pueden acceder a esta sección."
}) => {
  const navigate = useNavigate();

  // Get base path for images - normalize to ensure it starts with /
  // If VITE_BASE_PATH is "academics" (without leading slash), add it
  const rawBasePath = import.meta.env.VITE_BASE_PATH || "";
  const basePath = rawBasePath
    ? (rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`)
        .replace(/\/+$/, "") // Remove trailing slashes
    : "";
  const imagePath = basePath ? `${basePath}/images/access-denied.svg` : "/images/access-denied.svg";

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="max-w-lg w-full">
        <div className="text-center pb-2">
          <div className="mx-auto mb-4 max-w-sm">
            <img
              src={imagePath}
              alt="Acceso Denegado"
              className="w-full h-auto dark:opacity-90"
            />
          </div>
          <CardTitle className="text-3xl font-bold">
            Acceso No Autorizado
          </CardTitle>
        </div>
        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <p className="text-center text-lg text-foreground">
              No tienes permisos suficientes para acceder a <span className="font-semibold">{resourceName}</span>.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {message}
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={() => navigate(-1)} variant="outline" className="min-w-24">
              Volver
            </Button>
            <Button onClick={() => navigate("/tasks")} className="min-w-24">
              Ir a Inicio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
