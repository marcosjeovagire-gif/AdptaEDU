import { useState, useEffect } from 'react';
import {
  ConnectionStatus,
  ConnectivityDetails,
  getConnectionStatus,
  getConnectivityDetails,
  adicionarListenerConectividade,
  verificarConectividade,
  isRealOnline,
} from '../services/connectivityService';

export function useConnectivity() {
  const [status, setStatus] = useState<ConnectionStatus>(() => getConnectionStatus());
  const [details, setDetails] = useState<ConnectivityDetails>(() => getConnectivityDetails());

  useEffect(() => {
    const unsubscribe = adicionarListenerConectividade((newStatus, newDetails) => {
      setStatus(newStatus);
      setDetails(newDetails);
    });

    return unsubscribe;
  }, []);

  return {
    status,
    details,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isChecking: status === 'checking',
    isServerUnavailable: status === 'server-unavailable',
    checkNow: () => verificarConectividade({ force: true }),
    isRealOnline,
  };
}
