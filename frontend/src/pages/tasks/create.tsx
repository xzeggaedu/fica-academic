import React from "react";
import { useForm } from "@refinedev/react-hook-form";

export const TaskCreate = () => {
  const { saveButtonProps, register, formState: { errors } } = useForm();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Tarea</h1>

      <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje de la Tarea *
            </label>
            <textarea
              {...register("message", {
                required: "Este campo es obligatorio",
                minLength: { value: 1, message: "El mensaje no puede estar vacío" },
                maxLength: { value: 500, message: "El mensaje debe tener máximo 500 caracteres" },
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingrese el mensaje o descripción de la tarea..."
            />
            {errors?.message && (
              <p className="mt-1 text-sm text-red-600">{String(errors.message.message)}</p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              {...saveButtonProps}
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Crear Tarea
            </button>
          </div>
      </form>
    </div>
  );
};
