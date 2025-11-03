import { useNavigate } from "react-router";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotFoundProps {
  resourceName?: string;
  message?: string;
}

export const NotFound: React.FC<NotFoundProps> = ({
  resourceName = "el recurso",
  message = "El recurso que buscas no existe o ha sido eliminado."
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="max-w-lg w-full">
        <div className="text-center pb-2">
          <div className="mx-auto mb-4 max-w-sm">
            <div className="text-6xl font-bold text-muted-foreground mb-4">
              404
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            No Encontrado
          </CardTitle>
        </div>
        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <p className="text-center text-lg text-foreground">
              No se pudo encontrar <span className="font-semibold">{resourceName}</span>.
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
