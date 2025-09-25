import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { SessionExpiredModal } from '@/components/ui/modals/session-expired-modal';

interface SessionExpiredContextType {
  showSessionExpiredModal: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextType | undefined>(undefined);

interface SessionExpiredProviderProps {
  children: ReactNode;
}

export const SessionExpiredProvider: React.FC<SessionExpiredProviderProps> = ({ children }) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const navigate = useNavigate();

  const showSessionExpiredModal = useCallback(() => {
    setIsSessionExpired(true);
  }, []);

  const handleSessionExpiredConfirm = useCallback(() => {
    setIsSessionExpired(false);
    navigate('/login');
  }, [navigate]);

  // Escuchar el evento personalizado de sesión expirada
  useEffect(() => {
    const handleSessionExpired = () => {
      showSessionExpiredModal();
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [showSessionExpiredModal]);

  const value = {
    showSessionExpiredModal,
  };

  return (
    <SessionExpiredContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        open={isSessionExpired}
        onConfirm={handleSessionExpiredConfirm}
      />
    </SessionExpiredContext.Provider>
  );
};

export const useSessionExpiredContext = (): SessionExpiredContextType => {
  const context = useContext(SessionExpiredContext);
  if (context === undefined) {
    throw new Error('useSessionExpiredContext must be used within a SessionExpiredProvider');
  }
  return context;
};
