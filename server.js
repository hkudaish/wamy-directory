const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Data directory
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'directory-data.json');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

if (process.env.NODE_ENV === 'production' && !pool) {
  throw new Error('DATABASE_URL is required in production; refusing to use ephemeral file storage.');
}

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if it doesn't exist
const initializeDataFile = () => {
  if (!fs.existsSync(dataFile)) {
    const defaultData = {
      employees: [],
      favorites: [],
      logs: [],
      categories: [],
      users: [],
      directoryLastUpdated: new Date().toISOString(),
      directoryDataVersion: 8
    };
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

// Read data from PostgreSQL in production and the JSON file during local development.
const readData = async () => {
  try {
    if (pool) {
      const result = await pool.query('SELECT payload FROM directory_state WHERE id = 1');
      return result.rows[0]?.payload || null;
    }
    if (!fs.existsSync(dataFile)) {
      initializeDataFile();
    }
    const data = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading storage:', error);
    return null;
  }
};

// Persist data to PostgreSQL in production and JSON locally.
const writeData = async (data) => {
  try {
    if (pool) {
      await pool.query(
        `INSERT INTO directory_state (id, payload, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [JSON.stringify(data)]
      );
      return true;
    }
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing storage:', error);
    return false;
  }
};

const initializeStorage = async () => {
  if (!pool) {
    initializeDataFile();
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS directory_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await pool.query('SELECT 1 FROM directory_state WHERE id = 1');
  if (existing.rowCount === 0) {
    const initialData = readDataFromFile();
    await writeData(initialData);
    console.log('Initialized PostgreSQL from data/directory-data.json');
  }
};

const readDataFromFile = () => {
  initializeDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

// API Routes

// GET all data
app.get('/api/data', async (req, res) => {
  const data = await readData();
  if (data) {
    res.json({ success: true, data });
  } else {
    res.status(500).json({ success: false, error: 'Failed to read data' });
  }
});

// POST save all data
app.post('/api/data', async (req, res) => {
  const { employees, favorites, logs, categories, users, directoryLastUpdated, directoryDataVersion } = req.body;
  
  if (!Array.isArray(employees) || !Array.isArray(favorites)) {
    return res.status(400).json({ success: false, error: 'Invalid data format' });
  }

  const data = {
    employees,
    favorites,
    logs: Array.isArray(logs) ? logs : [],
    categories: Array.isArray(categories) ? categories : [],
    users: Array.isArray(users) ? users : [],
    directoryLastUpdated: directoryLastUpdated || new Date().toISOString(),
    directoryDataVersion: directoryDataVersion || 7
  };

  if (await writeData(data)) {
    res.json({ success: true, message: 'Data saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

// POST save employees only
app.post('/api/employees', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.employees = req.body;
  if (await writeData(data)) {
    res.json({ success: true, message: 'Employees saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save employees' });
  }
});

// POST save favorites only
app.post('/api/favorites', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.favorites = req.body;
  if (await writeData(data)) {
    res.json({ success: true, message: 'Favorites saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save favorites' });
  }
});

// POST save logs only
app.post('/api/logs', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.logs = req.body;
  if (await writeData(data)) {
    res.json({ success: true, message: 'Logs saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save logs' });
  }
});

// POST save categories only
app.post('/api/categories', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.categories = req.body;
  if (await writeData(data)) {
    res.json({ success: true, message: 'Categories saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save categories' });
  }
});

// POST save users only
app.post('/api/users', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.users = req.body;
  if (await writeData(data)) {
    res.json({ success: true, message: 'Users saved successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save users' });
  }
});

// POST update directory last updated timestamp
app.post('/api/directory-updated', async (req, res) => {
  const data = await readData();
  if (!data) {
    return res.status(500).json({ success: false, error: 'Failed to read data' });
  }

  data.directoryLastUpdated = new Date().toISOString();
  if (await writeData(data)) {
    res.json({ success: true, timestamp: data.directoryLastUpdated });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update timestamp' });
  }
});

// POST backup/restore
app.post('/api/backup', async (req, res) => {
  const data = await readData();
  if (data) {
    res.json({
      success: true,
      backup: {
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
      }
    });
  } else {
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

// POST restore from backup
app.post('/api/restore', async (req, res) => {
  const backup = req.body;
  
  if (!backup || !backup.data || !backup.settings) {
    return res.status(400).json({ success: false, error: 'Invalid backup format' });
  }

  const data = {
    employees: backup.data.employees || [],
    favorites: backup.settings.favorites || [],
    logs: backup.data.logs || [],
    categories: backup.settings.categories || [],
    users: backup.data.users || [],
    directoryLastUpdated: backup.settings.directoryLastUpdated || new Date().toISOString(),
    directoryDataVersion: backup.settings.directoryDataVersion || 7
  };

  if (await writeData(data)) {
    res.json({ success: true, message: 'Data restored successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to restore data' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  if (pool) {
    try {
      await pool.query('SELECT 1');
      return res.json({ status: 'ok', storage: 'postgresql', persistent: true });
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return res.status(503).json({ status: 'error', storage: 'postgresql', persistent: true });
    }
  }
  res.json({ status: 'ok', storage: 'local-json', persistent: false });
});

initializeStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`WAMY Directory Storage Server running on http://localhost:${PORT}`);
    console.log(`Storage: ${pool ? 'PostgreSQL' : dataFile}`);
  });
}).catch(error => {
  console.error('Failed to initialize persistent storage:', error);
  process.exit(1);
});
