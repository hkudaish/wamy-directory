# WAMY Directory Storage System

This directory now includes a persistent storage system that saves data outside of the browser to a file-based storage backend.

## Architecture

### Components

1. **server.js** - Node.js/Express server that handles data persistence
2. **storage-api.js** - Client-side storage abstraction layer
3. **data/directory-data.json** - Server-side data storage file
4. **package.json** - Node.js dependencies

### Storage Flow

```
Browser (Client)
    ↓
storage-api.js (Abstraction Layer)
    ↓
HTTP API (Express Server)
    ↓
data/directory-data.json (File Storage)
```

## Installation

### 1. Install Node.js Dependencies

```bash
npm install
```

This installs:
- **express** - Web server framework
- **cors** - Cross-Origin Resource Sharing support
- **nodemon** (dev) - Auto-restart server on file changes

### 2. Start the Server

```bash
npm start
```

Server will run on `http://localhost:3000`

For development with auto-reload:
```bash
npm run dev
```

## Integration with HTML App

### Option 1: With Server (Recommended)

Add this to your HTML `<head>` or before the closing `</body>`:

```html
<script src="storage-api.js"></script>
<script>
  // Initialize with server storage
  (async () => {
    await StorageAPI.init({
      useServer: true,
      serverUrl: 'http://localhost:3000',
      fallbackToLocal: true,
      debugMode: false
    });
    
    // Fetch existing data
    const data = await StorageAPI.fetchAllData();
    
    // When saving, use: await StorageAPI.save(data);
  })();
</script>
```

Then modify the `save()` function in index.html:

**Original:**
```javascript
function save(){
  localStorage.setItem('wamyEmployees',JSON.stringify(employees));
  // ... other localStorage calls
}
```

**Modified:**
```javascript
function save(){
  const data = {
    employees, favorites, logs, categories, users,
    directoryLastUpdated, directoryDataVersion: DIRECTORY_DATA_VERSION
  };
  
  StorageAPI.save(data).catch(error => {
    console.error('Save failed:', error);
    // Fallback to localStorage already handled by StorageAPI
  });
}
```

### Option 2: Fallback to Browser Storage Only

If you don't start the server, StorageAPI automatically falls back to localStorage.

## API Endpoints

### GET /api/data
Returns all stored data.

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [...],
    "favorites": [...],
    "logs": [...],
    "categories": [...],
    "users": [...],
    "directoryLastUpdated": "2024-01-15T10:30:00Z",
    "directoryDataVersion": 7
  }
}
```

### POST /api/data
Save all data at once.

**Request Body:**
```json
{
  "employees": [...],
  "favorites": [...],
  "logs": [...],
  "categories": [...],
  "users": [...],
  "directoryLastUpdated": "2024-01-15T10:30:00Z",
  "directoryDataVersion": 7
}
```

### POST /api/employees
Save only employees.

### POST /api/favorites
Save only favorites.

### POST /api/logs
Save only logs.

### POST /api/categories
Save only categories.

### POST /api/users
Save only users.

### POST /api/directory-updated
Update the directory's last-modified timestamp.

### POST /api/backup
Create and return a backup of all data.

### POST /api/restore
Restore data from a backup.

**Request Body:**
```json
{
  "format": "wamy-directory-backup",
  "backupVersion": 1,
  "data": {...},
  "settings": {...}
}
```

### GET /api/health
Check if server is running.

## Data Storage Structure

### Server Storage (data/directory-data.json)

```json
{
  "employees": [
    {
      "id": 1,
      "name": "الاسم",
      "title": "المسمى الوظيفي",
      "category": "التصنيف",
      "department": "الإدارة",
      "section": "القسم",
      "committee": "اللجنة",
      "office": "المكتب",
      "country": "الدولة",
      "ext": "التحويلة",
      "employeeNo": "الرقم الوظيفي",
      "mobile": "الجوال",
      "email": "البريد",
      "order": 1
    }
  ],
  "favorites": [1, 2, 3],
  "logs": [
    {
      "date": "2024-01-15 10:30:00",
      "msg": "تم تعديل بيانات الشخص"
    }
  ],
  "categories": ["التصنيف 1", "التصنيف 2"],
  "users": [
    {
      "id": 1,
      "name": "مدير النظام",
      "username": "admin",
      "role": "sysadmin",
      "password": "Admin@2026"
    }
  ],
  "directoryLastUpdated": "2024-01-15T10:30:00.000Z",
  "directoryDataVersion": 7
}
```

## StorageAPI Methods

### init(options)
Initialize the storage API.

**Options:**
- `useServer` (boolean) - Enable server storage (default: false)
- `serverUrl` (string) - Server URL (default: 'http://localhost:3000')
- `fallbackToLocal` (boolean) - Fall back to localStorage if server fails (default: true)
- `debugMode` (boolean) - Enable debug logging (default: false)

**Example:**
```javascript
await StorageAPI.init({
  useServer: true,
  serverUrl: 'http://localhost:3000'
});
```

### fetchAllData()
Get all data from server or localStorage.

```javascript
const data = await StorageAPI.fetchAllData();
console.log(data.employees);
```

### save(data)
Save data to server or localStorage.

```javascript
await StorageAPI.save({
  employees: [...],
  favorites: [...],
  logs: [...],
  categories: [...],
  users: [...],
  directoryLastUpdated: new Date().toISOString(),
  directoryDataVersion: 7
});
```

### sync()
Force synchronization with server.

```javascript
await StorageAPI.sync();
```

### createBackup()
Create a backup of all data.

```javascript
const backup = await StorageAPI.createBackup();
// Download or store backup...
```

### restoreBackup(backup)
Restore data from a backup.

```javascript
await StorageAPI.restoreBackup(backupData);
```

### getStatus()
Get storage system status.

```javascript
const status = await StorageAPI.getStatus();
// {
//   useServer: true,
//   serverStatus: 'connected',
//   fallbackToLocal: true,
//   hasLocalData: true
// }
```

## Configuration

### Environment Variables

Set the server port:
```bash
PORT=3000 npm start
```

## Security Considerations

⚠️ **Important:**

1. **No Authentication by Default** - Add authentication middleware before deployment
2. **No Encryption** - Consider encrypting sensitive data
3. **File Permissions** - Protect the `data/` directory
4. **CORS** - Currently allows all origins; restrict in production
5. **Rate Limiting** - Add rate limiting before deploying to production

### Example: Add Basic Authentication

Add to `server.js` before routes:

```javascript
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Add your auth logic here
  next();
};

app.use('/api/', basicAuth);
```

## Backup & Restore

### Create Backup

The export backup feature in the admin panel now saves to the server if configured.

### Restore Backup

Upload a previously exported backup file through the admin panel.

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Use a different port
PORT=3001 npm start
```

### "Cannot GET /" Error
Make sure you're serving the HTML app. The server serves static files from its directory.

Visit: `http://localhost:3000/index.html`

### CORS Errors
The server includes CORS headers. If still having issues, check:
- Server is running
- URL matches exactly (http vs https, port number)
- No proxy issues

### Data Not Persisting
1. Check `data/directory-data.json` exists
2. Check file permissions (should be readable/writable)
3. Enable debug mode: `StorageAPI.setDebug(true)`
4. Check browser console for errors

## File Structure

```
wamy-directory/
├── index.html                    # Main app (unchanged, uses storage-api.js)
├── server.js                     # Express server (NEW)
├── storage-api.js                # Storage abstraction layer (NEW)
├── package.json                  # Node.js dependencies (NEW)
├── data/                         # Server data directory (created at runtime)
│   └── directory-data.json       # Persistent data file (NEW)
├── a3-export-check.js
├── pdf-reference-check.js
├── wamy-logo.png
└── README.md
```

## Performance

- **First Load**: Data loaded from server or localStorage
- **Saves**: Asynchronous to avoid UI blocking
- **Caching**: Data cached in memory on client
- **Fallback**: Automatic fallback to localStorage if server unavailable

## Migrating from Browser Storage

1. Start the server
2. Navigate to the app
3. The storage API automatically syncs existing localStorage data to server
4. Future saves go to both server and localStorage (for redundancy)

## Advanced Usage

### Enable Debug Mode
```javascript
StorageAPI.setDebug(true);
```

### Manual Sync
```javascript
const data = await StorageAPI.sync();
```

### Get Current Config
```javascript
const config = StorageAPI.getConfig();
```

## License

MIT
