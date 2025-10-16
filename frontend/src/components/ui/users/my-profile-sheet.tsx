import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MyProfileEditForm } from "./my-profile-edit-form";
import { useUpdate, useOne, useInvalidate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditIcon, ArrowLeftIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserRoleEnum } from "../../../types/auth";

interface MyProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileUpdateFunction = (profileData: any) => void;
type PasswordUpdateFunction = (passwordData: any) => void;
type UpdatePayload = any;

interface UpdateState {
  functionCallback: ProfileUpdateFunction | PasswordUpdateFunction | null;
  payload: UpdatePayload | null;
  enable: boolean;
}

const getRoleVariant = (role: string) => {
  switch (role) {
    case UserRoleEnum.ADMIN:
      return "destructive";
    case UserRoleEnum.DIRECTOR:
      return "secondary";
    case UserRoleEnum.DECANO:
      return "default";
    case UserRoleEnum.VICERRECTOR:
      return "outline";
    case UserRoleEnum.UNAUTHORIZED:
    default:
      return "secondary";
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case UserRoleEnum.ADMIN:
      return "Administrador";
    case UserRoleEnum.DIRECTOR:
      return "Director";
    case UserRoleEnum.DECANO:
      return "Decano";
    case UserRoleEnum.VICERRECTOR:
      return "Vicerrector";
    case UserRoleEnum.UNAUTHORIZED:
    default:
      return "No Autorizado";
  }
};

export function MyProfileSheet({ isOpen, onClose }: MyProfileSheetProps) {
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");

  const [activeTab, setActiveTab] = useState("profile");
  const [updateState, setUpdateState] = useState<UpdateState>({
    functionCallback: null,
    payload: null,
    enable: false
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editFormRef = useRef<{ handleConfirmUpdate: () => void }>(null);

  // Refine hooks
  const { result: profileData, query: profileQuery } = useOne({
    resource: "users",
    id: "me/profile",
    queryOptions: {
      enabled: isOpen,
    },
  });

  const { mutate: updateProfile } = useUpdate();
  const { mutate: updatePassword } = useUpdate();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  // Mapear los datos del perfil al formato esperado
  const currentUser = profileData ? {
    id: profileData.uuid,
    name: profileData.name,
    username: profileData.username,
    email: profileData.email,
    role: profileData.role,
    avatar: profileData.profile_image_url,
  } : null;


  const isLoading = profileQuery.isLoading;
  const error = profileQuery.error?.message || null;

  const handleSuccess = async () => {
    // Invalidar la lista de usuarios (para actualizar la tabla)
    await invalidate({
      resource: "users",
      invalidates: ["list"]
    });

    // Invalidar específicamente el perfil del usuario actual (me/profile)
    await invalidate({
      resource: "users",
      invalidates: ["detail"],
      id: "me/profile"
    });

    // También invalidar el endpoint del usuario específico por ID
    if (currentUser?.id) {
      await invalidate({
        resource: "users",
        invalidates: ["detail"],
        id: currentUser.id
      });
    }

    // Invalidación agresiva usando queryClient directamente
    await queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.some(key =>
          typeof key === 'string' && key.includes('users')
        );
      }
    });

    setViewMode("view");
    setIsSubmitting(false);
    setShowConfirmDialog(false);
    onClose();
  };

  const handleUpdateUser: ProfileUpdateFunction = (profileData: any) => {
    // Validar que tenemos los datos necesarios
    if (!currentUser?.id) {
      setIsSubmitting(false);
      return;
    }

    if (!profileData || Object.keys(profileData).length === 0) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Pequeño delay para asegurar que el estado esté estable
    setTimeout(() => {
      updateProfile({
        resource: "users",
        id: currentUser.id,
        values: profileData,
      }, {
        onSuccess: () => {
          handleSuccess();
        },
        onError: () => {
          setIsSubmitting(false);
        }
      });
    }, 100);
  };

  const handleUpdatePassword: PasswordUpdateFunction = (passwordData: any) => {
    // Validar que tenemos los datos necesarios
    if (!currentUser?.id) {
      setIsSubmitting(false);
      return;
    }

    if (!passwordData || Object.keys(passwordData).length === 0) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Pequeño delay para asegurar que el estado esté estable
    setTimeout(() => {
      updatePassword({
        resource: "users",
        id: `${currentUser.id}/password`,
        values: passwordData,
        meta: {
          method: "patch"
        },
        invalidates: []
      }, {
        onSuccess: () => {
          handleSuccess();
        },
        onError: () => {
          setIsSubmitting(false);
        }
      });
    }, 100);
  };

  // Función para obtener la función de callback correcta basada en el tab activo
  const getUpdateCallback = () => {
    if (activeTab === "profile") {
      return handleUpdateUser;
    } else if (activeTab === "password") {
      return handleUpdatePassword;
    }
    return null;
  };

  // Efecto para establecer la función de actualización según el tab activo del formulario
  useEffect(() => {
    const callback = getUpdateCallback();
    if (callback) {
      setUpdateState(prev => ({ ...prev, functionCallback: callback }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleActiveTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleSubmitClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmUpdate = () => {
    if (updateState.payload) {
      // Obtener la función correcta en tiempo de ejecución para evitar problemas de closure
      const callback = getUpdateCallback();
      if (callback) {
        callback(updateState.payload);
      }
    }
    setShowConfirmDialog(false);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setIsSubmitting(false);
  };

  // Memoizar el componente MyProfileEditForm para evitar re-renders innecesarios
  const MemoizedEditForm = useMemo(() => {
    return (
      <MyProfileEditForm
        data={currentUser}
        isLoading={isLoading}
        error={error}
        onActiveTabChange={handleActiveTabChange}
        setUpdateState={setUpdateState}
      />
    );
  }, [currentUser?.name, currentUser?.email, isLoading, error]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[90vw] flex flex-col">
          <SheetHeader className="flex-shrink-0 px-6">
            <SheetTitle className="text-xl font-bold">
              {viewMode === "view" ? "Mi Perfil" : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("view")}
                    className="h-8 w-8 p-0 mr-2"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </Button>
                  Editar Mi Perfil
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {viewMode === "view"
                ? "Información de tu perfil de usuario"
                : "Actualiza tu información personal"
              }
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 relative overflow-hidden">
            {/* Fade effect at the top */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none"></div>

            {/* Scrollable content */}
            <div className="h-full overflow-y-auto py-0 px-6">
              <div className="py-2">
                {viewMode === "view" ? (
                  <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="space-y-4">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage
                            src={currentUser?.avatar}
                            alt={currentUser?.name}
                          />
                          <AvatarFallback className="text-lg">
                            {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">{currentUser?.name}</h2>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewMode("edit")}
                              className="h-8 w-8 p-0"
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-muted-foreground">@{currentUser?.username}</p>
                          <Badge variant={getRoleVariant(currentUser?.role)} className="text-sm">
                            {getRoleLabel(currentUser?.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <Separator />
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold flex justify-between items-center">
                        <span>Información del Usuario</span>
                      </h3>

                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">ID de Usuario:</label>
                            <p className="text-sm">{currentUser?.id}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Nombre de Usuario</label>
                            <p className="text-sm">{currentUser?.username}</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                            <p className="text-sm">{currentUser?.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  MemoizedEditForm
                )}
              </div>
            </div>

            {/* Fade effect at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
          </div>

          {/* Footer with action buttons */}
          {viewMode === "edit" && (
            <SheetFooter className="flex-shrink-0 px-6 py-4 border-t">
              <div className="flex justify-end space-x-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setViewMode("view")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitClick}
                  disabled={isSubmitting || !updateState.enable || !updateState.payload}
                >
                  {isSubmitting ? "Actualizando..." : "Actualizar Perfil"}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTab === "profile" ? "Confirmar Actualización de Perfil" : "Confirmar Cambio de Contraseña"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTab === "profile"
                ? "¿Estás seguro de que quieres actualizar tu información de perfil?"
                : "¿Estás seguro de que quieres cambiar tu contraseña?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate} disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
