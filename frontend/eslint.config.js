import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "off",
        { allowConstantExport: true },
      ],
      // Reglas menos estrictas para desarrollo
      "@typescript-eslint/no-unused-vars": "off", // Cambiar de error a warning
      "@typescript-eslint/no-explicit-any": "off", // Cambiar de error a warning
      "prefer-const": "error", // Cambiar de error a warning
      "no-useless-escape": "off", // Cambiar de error a warning
      "no-case-declarations": "off", // Cambiar de error a warning
      "react-hooks/exhaustive-deps": "off", // Cambiar de error a warning
      "react-hooks/rules-of-hooks": "error", // Mantener como error (crítico)
      // Deshabilitar reglas muy estrictas
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      // Reglas de formato menos estrictas
      "no-console": "off",
      "no-debugger": "warn",
    },
  }
);
