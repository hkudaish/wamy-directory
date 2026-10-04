/**
 * Storage API - Abstraction layer for data persistence
 * Supports both browser localStorage and server-based storage
 * 
 * Usage:
 *   StorageAPI.init({ useServer: true, serverUrl: 'http://localhost:3000' });
 *   await StorageAPI.save(key, value);
 *   const data = await StorageAPI.load(key);
 */

const StorageAPI = (() => {
  let config = {
    useServer: false,
    serverUrl: 'http://localhost:3000',
    fallbackToLocal: true,
    debugMode: false
  };

  let cacheData = null;
  let isSyncing = false;

  const log = (message, data = null) => {
    if (config.debugMode) {
      console.log(`[StorageAPI] ${message}`, data || '');
    }
  };

  const logError = (message, error) => {
    console.error(`[StorageAPI] ${message}`, error);
  };

  /**
   * Initialize the storage API
   */
  const init = async (options = {}) => {
    config = { ...config, ...options };
    log('Initialized with config', config);

    if (config.useServer) {
      try {
        const response = await fetch(`${config.serverUrl}/api/health`);
        if (response.ok) {
          log('Server is available');
          return true;
        }
      } catch (error) {
        logError('Server not available', error);
        if (!config.fallbackToLocal) {
          throw error;
        }
      }
    }

    return true;
  };

  /**
   * Fetch all data from server or localStorage
   */
  const fetchAllData = async () => {
    if (config.useServer) {
      try {
        const response = await fetch(`${config.serverUrl}/api/data`);
        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            cacheData = json.data;
            log('Data fetched from server');
            return cacheData;
          }
        }
      } catch (error) {
        logError('Failed to fetch from server', error);
        if (!config.fallbackToLocal) throw error;
      }
    }

    // Fallback to localStorage
    return getDataFromLocalStorage();
  };

  /**
   * Get data from localStorage
   */
  const getDataFromLocalStorage = () => {
    try {
      return {
        employees: JSON.parse(localStorage.getItem('wamyEmployees') || '[]'),
        favorites: JSON.parse(localStorage.getItem('wamyFavorites') || '[]'),
        logs: JSON.parse(localStorage.getItem('wamyLogs') || '[]'),
        categories: JSON.parse(localStorage.getItem('wamyCategories') || '[]'),
        users: JSON.parse(localStorage.getItem('wamyUsers') || '[]'),
        directoryLastUpdated: localStorage.getItem('wamyDirectoryLastUpdated') || new Date().toISOString(),
        directoryDataVersion: Number(localStorage.getItem('wamyDirectoryDataVersion') || 7)
      };
    } catch (error) {
      logError('Failed to read localStorage', error);
      return {
        employees: [],
        favorites: [],
        logs: [],
        categories: [],
        users: [],
        directoryLastUpdated: new Date().toISOString(),
        directoryDataVersion: 7
      };
    }
  };

  /**
   * Set data to localStorage
   */
  const setDataToLocalStorage = (data) => {
    try {
      localStorage.setItem('wamyEmployees', JSON.stringify(data.employees || []));
      localStorage.setItem('wamyFavorites', JSON.stringify(data.favorites || []));
      localStorage.setItem('wamyLogs', JSON.stringify(data.logs || []));
      localStorage.setItem('wamyCategories', JSON.stringify(data.categories || []));
      localStorage.setItem('wamyUsers', JSON.stringify(data.users || []));
      localStorage.setItem('wamyDirectoryLastUpdated', data.directoryLastUpdated || new Date().toISOString());
      localStorage.setItem('wamyDirectoryDataVersion', String(data.directoryDataVersion || 7));
      log('Data saved to localStorage');
      return true;
    } catch (error) {
      logError('Failed to save to localStorage', error);
      return false;
    }
  };

  /**
   * Save data to server or localStorage
   */
  const save = async (data) => {
    if (isSyncing) {
      log('Sync already in progress, skipping');
      return false;
    }

    isSyncing = true;
    try {
      cacheData = data;

      // Always save to localStorage as backup
      setDataToLocalStorage(data);

      if (config.useServer) {
        try {
          const response = await fetch(`${config.serverUrl}/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (response.ok) {
            const json = await response.json();
            if (json.success) {
              log('Data saved to server');
              return true;
            }
          }
        } catch (error) {
          logError('Failed to save to server', error);
          if (!config.fallbackToLocal) throw error;
        }
      }

      log('Data saved (localStorage)');
      return true;
    } finally {
      isSyncing = false;
    }
  };

  /**
   * Sync data with server
   */
  const sync = async () => {
    return fetchAllData();
  };

  /**
   * Create a backup and return it
   */
  const createBackup = async () => {
    if (config.useServer) {
      try {
        const response = await fetch(`${config.serverUrl}/api/backup`);
        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            log('Backup created on server');
            return json.backup;
          }
        }
      } catch (error) {
        logError('Failed to create backup on server', error);
        if (!config.fallbackToLocal) throw error;
      }
    }

    // Fallback: create from localStorage
    const data = getDataFromLocalStorage();
    return {
      format: 'wamy-directory-backup',
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        employees: data.employees,
        logs: data.logs,
        users: data.users
      },
      settings: {
        categories: data.categories,
        favorites: data.favorites,
        directoryDataVersion: data.directoryDataVersion,
        directoryLastUpdated: data.directoryLastUpdated
      }
    };
  };

  /**
   * Restore from a backup
   */
  const restoreBackup = async (backup) => {
    if (config.useServer) {
      try {
        const response = await fetch(`${config.serverUrl}/api/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backup)
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            log('Data restored from server');
            return true;
          }
        }
      } catch (error) {
        logError('Failed to restore on server', error);
        if (!config.fallbackToLocal) throw error;
      }
    }

    // Fallback: restore to localStorage
    if (backup.data && backup.settings) {
      const data = {
        employees: backup.data.employees || [],
        favorites: backup.settings.favorites || [],
        logs: backup.data.logs || [],
        categories: backup.settings.categories || [],
        users: backup.data.users || [],
        directoryLastUpdated: backup.settings.directoryLastUpdated || new Date().toISOString(),
        directoryDataVersion: backup.settings.directoryDataVersion || 7
      };

      return save(data);
    }

    return false;
  };

  /**
   * Get status information
   */
  const getStatus = async () => {
    let serverStatus = 'not configured';

    if (config.useServer) {
      try {
        const response = await fetch(`${config.serverUrl}/api/health`);
        serverStatus = response.ok ? 'connected' : 'disconnected';
      } catch {
        serverStatus = 'disconnected';
      }
    }

    return {
      useServer: config.useServer,
      serverStatus,
      fallbackToLocal: config.fallbackToLocal,
      hasLocalData: !!localStorage.getItem('wamyEmployees')
    };
  };

  // Public API
  return {
    init,
    save,
    fetchAllData,
    sync,
    createBackup,
    restoreBackup,
    getStatus,
    // Expose config for advanced usage
    getConfig: () => ({ ...config }),
    setDebug: (debug) => { config.debugMode = debug; }
  };
})();

// Auto-init on script load (can be overridden by calling StorageAPI.init)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (!window.StorageAPI) {
      window.StorageAPI = StorageAPI;
    }
  });
}
