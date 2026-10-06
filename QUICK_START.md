# Quick Start Guide - Storage System

> This guide covers local development only. Production uses Netlify Blobs on Netlify or managed PostgreSQL on Render; see [NETLIFY_STORAGE.md](NETLIFY_STORAGE.md) or [PERSISTENT_STORAGE.md](PERSISTENT_STORAGE.md).

## 1. Install Dependencies

Open PowerShell/Terminal in the `d:\wamy-directory` folder and run:

```powershell
npm install
```

This installs the Express, CORS, and PostgreSQL packages needed for the server.

## 2. Start the Server

```powershell
npm start
```

You should see:
```
WAMY Directory Storage Server running on http://localhost:3000
Data directory: d:\wamy-directory\data
Data file: d:\wamy-directory\data\directory-data.json
```

Keep this terminal open while using the app.

## 3. Update index.html (Optional but Recommended)

To enable server-based storage, add this to your `index.html` **inside the `<head>` tag** or **just before `</body>`**:

```html
<script src="storage-api.js"></script>
<script>
// Initialize Storage API with server support
(async () => {
  try {
    await StorageAPI.init({
      useServer: true,
      serverUrl: 'http://localhost:3000',
      fallbackToLocal: true,
      debugMode: false
    });
    console.log('Storage API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Storage API:', error);
  }
})();
</script>
```

## 4. Replace the `save()` Function

Find this function in `index.html` (around line 300+):

```javascript
function save(){
  localStorage.setItem('wamyEmployees',JSON.stringify(employees));
  localStorage.setItem('wamyCategories',JSON.stringify(categories));
  localStorage.setItem('wamyFavorites',JSON.stringify(favorites));
  localStorage.setItem('wamyLogs',JSON.stringify(logs));
  localStorage.setItem('wamyUsers',JSON.stringify(users));
  localStorage.setItem('wamyDirectoryDataVersion',String(DIRECTORY_DATA_VERSION));
  localStorage.setItem('wamyDirectoryLastUpdated',directoryLastUpdated);
}
```

Replace it with:

```javascript
function save(){
  // Prepare data object
  const dataToSave = {
    employees,
    categories,
    favorites,
    logs,
    users,
    directoryLastUpdated,
    directoryDataVersion: DIRECTORY_DATA_VERSION
  };
  
  // Save to server or localStorage (async)
  if (window.StorageAPI) {
    StorageAPI.save(dataToSave).catch(error => {
      console.error('Failed to save data:', error);
      // StorageAPI automatically falls back to localStorage
    });
  } else {
    // Fallback if StorageAPI not loaded
    localStorage.setItem('wamyEmployees',JSON.stringify(employees));
    localStorage.setItem('wamyCategories',JSON.stringify(categories));
    localStorage.setItem('wamyFavorites',JSON.stringify(favorites));
    localStorage.setItem('wamyLogs',JSON.stringify(logs));
    localStorage.setItem('wamyUsers',JSON.stringify(users));
    localStorage.setItem('wamyDirectoryDataVersion',String(DIRECTORY_DATA_VERSION));
    localStorage.setItem('wamyDirectoryLastUpdated',directoryLastUpdated);
  }
}
```

## Usage

### Open the App

Once the server is running:

```
http://localhost:3000/index.html
```

### Data Flow

1. ✅ Data saved in browser localStorage (always)
2. ✅ Data also sent to server if running (if StorageAPI configured)
3. ✅ Server saves to `data/directory-data.json` file

### Check Saved Data

The file `data/directory-data.json` contains all your persistent data:

```bash
# View the data file
type data/directory-data.json
```

## Features

✅ **Server-based Storage**: Data persists in files, not just browser  
✅ **Fallback Support**: Works without server (uses browser storage)  
✅ **Auto-Sync**: Keeps browser and server in sync  
✅ **Backup/Restore**: Full backup support  
✅ **No Authentication Setup**: Works out of the box (add auth for production)

## What's Being Stored?

- Employees data
- Favorites
- Change logs
- Categories
- User accounts
- Directory metadata

## Stop the Server

Press `Ctrl+C` in the terminal running `npm start`

## Common Issues

### "Connection refused"
- Make sure `npm start` is running in another terminal
- Check if port 3000 is available

### Changes not saving
- Check server terminal for errors
- Verify `data/directory-data.json` is writable
- Open browser console (F12) for debug messages

### Want to go back to browser-only storage?
- Simply don't initialize StorageAPI
- Or stop the server - app falls back to localStorage

## Next Steps

1. ✅ Run `npm install`
2. ✅ Run `npm start`
3. ✅ Open app at `http://localhost:3000/index.html`
4. ✅ (Optional) Update `index.html` with StorageAPI integration
5. ✅ Start using the app - data is now persistent!

## For Production

Before deploying to production:

1. Add authentication (see STORAGE_SYSTEM.md)
2. Add rate limiting
3. Use HTTPS
4. Restrict CORS origins
5. Backup data regularly
6. Use a database instead of JSON (optional but recommended)

See STORAGE_SYSTEM.md for detailed instructions.
