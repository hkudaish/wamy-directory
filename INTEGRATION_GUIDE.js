/**
 * INTEGRATION EXAMPLE - How to integrate StorageAPI with index.html
 * 
 * This file shows the recommended changes to make the app use
 * the persistent storage system while keeping localStorage as fallback.
 * 
 * Follow the steps below to integrate into your index.html
 */

// ============================================================================
// STEP 1: Add this script tag to your HTML <head> or before </body>
// ============================================================================
/*
<script src="storage-api.js"></script>
<script>
  // Initialize Storage API when document is ready
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.StorageAPI) {
      await StorageAPI.init({
        useServer: true,
        serverUrl: 'http://localhost:3000',
        fallbackToLocal: true,  // Use localStorage if server unavailable
        debugMode: false        // Set to true to see console logs
      });
    }
  });
</script>
*/

// ============================================================================
// STEP 2: Replace the save() function in your index.html
// ============================================================================

// ORIGINAL save() function in index.html (around line 300+):
/*
function save(){
  localStorage.setItem('wamyEmployees',JSON.stringify(employees));
  localStorage.setItem('wamyCategories',JSON.stringify(categories));
  localStorage.setItem('wamyFavorites',JSON.stringify(favorites));
  localStorage.setItem('wamyLogs',JSON.stringify(logs));
  localStorage.setItem('wamyUsers',JSON.stringify(users));
  localStorage.setItem('wamyDirectoryDataVersion',String(DIRECTORY_DATA_VERSION));
  localStorage.setItem('wamyDirectoryLastUpdated',directoryLastUpdated);
}
*/

// UPDATED save() function with StorageAPI support:
/*
function save(){
  const dataToSave = {
    employees,
    categories,
    favorites,
    logs,
    users,
    directoryLastUpdated,
    directoryDataVersion: DIRECTORY_DATA_VERSION
  };
  
  // Use StorageAPI if available and configured
  if (window.StorageAPI) {
    StorageAPI.save(dataToSave).catch(error => {
      console.error('[Storage] Failed to save:', error);
      // Note: StorageAPI automatically falls back to localStorage
    });
  } else {
    // Fallback: save to localStorage directly
    localStorage.setItem('wamyEmployees', JSON.stringify(employees));
    localStorage.setItem('wamyCategories', JSON.stringify(categories));
    localStorage.setItem('wamyFavorites', JSON.stringify(favorites));
    localStorage.setItem('wamyLogs', JSON.stringify(logs));
    localStorage.setItem('wamyUsers', JSON.stringify(users));
    localStorage.setItem('wamyDirectoryDataVersion', String(DIRECTORY_DATA_VERSION));
    localStorage.setItem('wamyDirectoryLastUpdated', directoryLastUpdated);
  }
}
*/

// ============================================================================
// STEP 3: (OPTIONAL) Replace init() to load data from StorageAPI
// ============================================================================

// Find the init() function and add this at the beginning:
/*
async function init(){
  // Async initialization moved to separate function
  await initializeStorage();
  
  migrateDirectoryData();
  renderChips();
  fillDepartments();
  // ... rest of init() code
}

async function initializeStorage(){
  if (window.StorageAPI) {
    try {
      // Fetch data from server or localStorage
      const data = await StorageAPI.fetchAllData();
      
      // Update global variables
      employees = data.employees || employees;
      favorites = data.favorites || favorites;
      logs = data.logs || logs;
      categories = data.categories || categories;
      users = data.users || users;
      directoryLastUpdated = data.directoryLastUpdated || directoryLastUpdated;
      
      console.log('[Storage] Data loaded successfully');
    } catch (error) {
      console.error('[Storage] Failed to load data:', error);
      // Continue with localStorage data
    }
  }
}
*/

// ============================================================================
// STEP 4: Monitor Storage Status (OPTIONAL)
// ============================================================================

// Add this function to check and display storage status:
/*
async function checkStorageStatus(){
  if (window.StorageAPI) {
    const status = await StorageAPI.getStatus();
    console.log('[Storage Status]', status);
    
    // Optionally display to user
    if (status.useServer) {
      console.log(
        `Server: ${status.serverStatus}`,
        `Local Backup: ${status.hasLocalData ? 'Yes' : 'No'}`
      );
    }
  }
}
*/

// ============================================================================
// STEP 5: Handle Backup/Restore with StorageAPI (OPTIONAL)
// ============================================================================

// Modify your backup function to use StorageAPI:
/*
async function exportBackup(){
  if(!isSysAdmin())return alert('تصدير النسخة الاحتياطية متاح لمدير النظام فقط');
  
  let backup;
  
  if (window.StorageAPI) {
    // Use StorageAPI to create backup (syncs with server)
    backup = await StorageAPI.createBackup();
  } else {
    // Fallback: build from current data
    backup = buildBackupPayload();
  }
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], 
    {type:'application/json;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `نسخة_احتياطية_دليل_الموظفين_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
*/

// Modify your restore function:
/*
function importBackup(ev){
  if(!isSysAdmin())return alert('استيراد النسخة الاحتياطية متاح لمدير النظام فقط');
  
  const f = ev.target.files[0];
  if(!f)return;
  
  const r = new FileReader();
  r.onload = async () => {
    try {
      const backup = JSON.parse(r.result);
      validateBackupPayload(backup);
      
      if (window.StorageAPI) {
        // Use StorageAPI to restore (syncs with server)
        await StorageAPI.restoreBackup(backup);
      } else {
        // Fallback: restore directly
        // Use existing restoreFromBackup() logic
      }
      
      // Reload data
      location.reload();
    } catch(error){
      alert(`خطأ في استيراد النسخة: ${error.message}`);
    }
  };
  r.readAsText(f,'utf-8');
}
*/

// ============================================================================
// TESTING THE INTEGRATION
// ============================================================================

/*
1. Start the server:
   npm start

2. Open browser console (F12)

3. Check StorageAPI is initialized:
   console.log(window.StorageAPI);

4. Check storage status:
   StorageAPI.getStatus().then(s => console.log(s));

5. Make a change in the app (add employee, etc.)

6. Check if data persisted in server file:
   type data/directory-data.json

7. Refresh the page - data should load from server
*/

// ============================================================================
// MIGRATION FROM BROWSER-ONLY TO SERVER STORAGE
// ============================================================================

/*
If you already have data in localStorage:

1. Start server: npm start
2. Update index.html with StorageAPI integration
3. Open the app in browser
4. StorageAPI automatically:
   - Reads existing localStorage data
   - Saves to server on first save() call
   - Keeps both in sync for redundancy

All your existing data is preserved!
*/

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

/*
StorageAPI.init({
  // Enable server-based storage
  useServer: true,
  
  // Server URL (change if running on different host/port)
  serverUrl: 'http://localhost:3000',
  
  // Fall back to localStorage if server unavailable
  fallbackToLocal: true,
  
  // Enable debug console logs
  debugMode: false
});

For production:
- Change serverUrl to your production server URL
- Consider adding: https://yourserver.com
- Add authentication tokens to requests
*/

// ============================================================================
// ADVANCED: CUSTOM SYNC INTERVAL
// ============================================================================

/*
// Auto-sync every 5 minutes (if needed)
setInterval(async () => {
  if (window.StorageAPI) {
    try {
      await StorageAPI.sync();
      console.log('Auto-sync completed');
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }
}, 5 * 60 * 1000);
*/

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
Problem: "Uncaught SyntaxError: Unexpected token in JSON"
Solution: Check data/directory-data.json is valid JSON. Try resetting server.

Problem: CORS error
Solution: Server has CORS enabled. If persists, check:
  - Are you on correct domain/port?
  - Check CORS config in server.js

Problem: Data not saving to server
Solution: 
  1. Is server running? Check terminal
  2. Enable debug: StorageAPI.setDebug(true)
  3. Check server logs for errors
  4. Verify data/directory-data.json is writable

Problem: Server crashes on startup
Solution:
  - Check if port 3000 is in use
  - Try different port: PORT=3001 npm start
  - Check Node.js version: node --version
  - Reinstall dependencies: rm node_modules && npm install
*/
