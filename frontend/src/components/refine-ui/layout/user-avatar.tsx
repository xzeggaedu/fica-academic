import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGetIdentity } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
};

const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "fica-access-token";

export function UserAvatar() {
  const queryClient = useQueryClient();
  const tokenRef = useRef<string | null>(null);
  const { data: user, isLoading: userIsLoading, refetch } = useGetIdentity<User>();

  // Resetear y refrescar caché cuando cambia el token (después de login)
  useEffect(() => {
    const handleLogin = async () => {
      const currentToken = localStorage.getItem(TOKEN_KEY);

      // Si el token cambió, resetear completamente el caché de identidad
      if (tokenRef.current !== currentToken && currentToken) {
        tokenRef.current = currentToken;

        // Resetear completamente las queries relacionadas con identidad
        await queryClient.resetQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            if (Array.isArray(queryKey)) {
              const keyString = JSON.stringify(queryKey);
              return (
                keyString.includes('getIdentity') ||
                keyString.includes('identity') ||
                queryKey.some(
                  (key) =>
                    typeof key === 'string' &&
                    (key.toLowerCase().includes('identity') || key.toLowerCase().includes('getidentity'))
                )
              );
            }
            return false;
          },
        });

        // También remover del caché
        queryClient.removeQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            if (Array.isArray(queryKey)) {
              const keyString = JSON.stringify(queryKey);
              return (
                keyString.includes('getIdentity') ||
                keyString.includes('identity')
              );
            }
            return false;
          },
        });

        // Forzar refetch de la identidad
        await refetch?.();
      }
    };

    // Escuchar evento de login
    window.addEventListener('user-login', handleLogin);

    // Verificar token inicial
    const initialToken = localStorage.getItem(TOKEN_KEY);
    tokenRef.current = initialToken;

    return () => {
      window.removeEventListener('user-login', handleLogin);
    };
  }, [queryClient, refetch]);

  if (userIsLoading || !user) {
    return <Skeleton className={cn("h-10", "w-10", "rounded-full")} />;
  }

  const { name, avatar } = user;

  return (
    <Avatar className={cn("h-10", "w-10")}>
      {avatar && <AvatarImage src={avatar} alt={name} />}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

const getInitials = (name = "") => {
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();

  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

UserAvatar.displayName = "UserAvatar";
