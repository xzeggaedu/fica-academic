"use client";

import { useState } from "react";


import { InputPassword } from "@/components/refine-ui/form/input-password";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLink, useLogin, useRefineOptions } from "@refinedev/core";

export const SignInForm = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const Link = useLink();

  const { title } = useRefineOptions();

  const { mutate: login } = useLogin();

  // Get base path for images
  const basePath = import.meta.env.VITE_BASE_PATH || "";
  const logoPath = `${basePath}/images/logo-utec.png`;

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    login({
      username,
      password,
      remember_me: rememberMe,
    });
  };


  return (
    <div
      className={cn(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "px-6",
        "py-8",
        "min-h-svh"
      )}
    >

      <Card className={cn("sm:w-[456px]", "p-12", "mt-6", "relative")}>
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <CardHeader className={cn("px-0")}>
          <CardTitle
            className={cn(
              "dark:text-blue-400",
              "text-3xl",
              "font-semibold"
            )}
          >
            <div className={cn("mb-4")}>
          <img
            src={logoPath}
            alt="Logo UTEC"
            className={cn("w-full", "max-w-[220px]", "min-w-[120px]", "h-auto", "object-contain")}
          />
        </div>
          </CardTitle>
          <CardDescription
            className={cn("text-muted-foreground", "font-medium")}
          >
            Sistema de Gestión de la Carga Académica
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className={cn("px-0")}>
          <form onSubmit={handleSignIn}>
            <div className={cn("flex", "flex-col", "gap-2")}>
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder=""
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div
              className={cn("relative", "flex", "flex-col", "gap-2", "mt-6")}
            >
              <Label htmlFor="password">Contraseña</Label>
              <InputPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div
              className={cn(
                "flex items-center justify-start",
                "mt-4"
              )}
            >
              <div className={cn("flex items-center", "space-x-2")}>
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === "indeterminate" ? false : checked)
                  }
                />
                <Label htmlFor="remember">Recordarme</Label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="lg" className={cn("w-fit", "mt-6 ml-auto")}>
                Iniciar Sesión
              </Button>
            </div>
          </form>
        </CardContent>

      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
