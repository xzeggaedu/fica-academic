import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiError, formatErrorForDisplay } from '@/hooks/use-api-debug';

interface ErrorDebugPanelProps {
  error: ApiError;
  onDismiss?: () => void;
  title?: string;
}

export function ErrorDebugPanel({
  error,
  onDismiss,
  title = "Error de API"
}: ErrorDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const errorText = formatErrorForDisplay(error);
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'bg-gray-500';
    if (status >= 500) return 'bg-red-500';
    if (status >= 400) return 'bg-orange-500';
    if (status >= 300) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusLabel = (status?: number) => {
    if (!status) return 'Network Error';
    if (status >= 500) return 'Server Error';
    if (status >= 400) return 'Client Error';
    if (status >= 300) return 'Redirect';
    return 'Success';
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800 text-lg">{title}</CardTitle>
            {error.status && (
              <Badge className={`${getStatusColor(error.status)} text-white`}>
                {error.status} - {getStatusLabel(error.status)}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-red-600 hover:text-red-700"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-red-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto text-red-600 hover:text-red-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <span className="font-medium">{error.message}</span>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {error.method && (
                <div>
                  <span className="font-semibold text-red-700">Método:</span>
                  <Badge variant="outline" className="ml-2">
                    {error.method}
                  </Badge>
                </div>
              )}

              {error.url && (
                <div>
                  <span className="font-semibold text-red-700">URL:</span>
                  <code className="ml-2 text-xs bg-red-100 px-2 py-1 rounded">
                    {error.url}
                  </code>
                </div>
              )}

              {error.status && (
                <div>
                  <span className="font-semibold text-red-700">Status:</span>
                  <span className="ml-2">{error.status}</span>
                </div>
              )}

              {error.statusText && (
                <div>
                  <span className="font-semibold text-red-700">Status Text:</span>
                  <span className="ml-2">{error.statusText}</span>
                </div>
              )}
            </div>

            {/* Detalles del servidor */}
            {error.details && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">
                  📋 Respuesta del Servidor:
                </h4>
                <pre className="bg-red-100 p-3 rounded text-xs overflow-x-auto border">
                  {typeof error.details === 'string'
                    ? error.details
                    : JSON.stringify(error.details, null, 2)
                  }
                </pre>
              </div>
            )}

            {/* Información de desarrollo */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-700 font-semibold">💡 Información para Desarrolladores</span>
              </div>
              <div className="text-sm text-blue-600 space-y-1">
                <p>• Verifica que el backend esté ejecutándose en el puerto correcto</p>
                <p>• Revisa la consola del navegador para más detalles</p>
                <p>• Verifica la configuración de CORS en el backend</p>
                <p>• Comprueba que el endpoint existe y acepta el método HTTP correcto</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
