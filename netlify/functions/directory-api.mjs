import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { getStore } from '@netlify/blobs';

const require = createRequire(import.meta.url);
const bundledSeed = require('../../data/directory-data.json');

const DATA_STORE = 'wamy-directory-data';
const SESSION_STORE = 'wamy-directory-sessions';
const DATA_KEY = 'directory-state';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const LIVE_API_URL = 'https://wamy-directory.onrender.com/api/data';

const dataStore = () => getStore({ name: DATA_STORE, consistency: 'strong' });
const sessionStore = () => getStore({ name: SESSION_STORE, consistency: 'strong' });
const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
});

function defaultState() {
  return {
    employees: [],
    favorites: [],
    logs: [],
    categories: [],
    users: [],
    directoryLastUpdated: new Date().toISOString(),
    directoryDataVersion: 8
  };
}

async function loadInitialState() {
  try {
    const response = await fetch(LIVE_API_URL, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const result = await response.json();
      if (result?.success && Array.isArray(result.data?.employees)) return result.data;
    }
  } catch (error) {
    console.warn('Could not import from the existing directory API:', error);
  }

  return Array.isArray(bundledSeed?.employees) ? bundledSeed : defaultState();
}

async function readState(request) {
  const store = dataStore();
  const existing = await store.get(DATA_KEY, { type: 'json', consistency: 'strong' });
  if (existing) return existing;

  const seeded = await loadInitialState();
  await store.setJSON(DATA_KEY, seeded);
  return seeded;
}

function publicState(state) {
  return {
    ...state,
    users: (Array.isArray(state.users) ? state.users : []).map(({ password, ...user }) => user)
  };
}

function cookieValue(cookieHeader, key) {
  const entry = (cookieHeader || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${key}=`));
  return entry ? decodeURIComponent(entry.slice(key.length + 1)) : '';
}

function sessionCookie(token, maxAge) {
  return `wamy_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

async function currentUser(request, state) {
  const token = cookieValue(request.headers.get('cookie'), 'wamy_session');
  if (!token) return null;
  const key = createHash('sha256').update(token).digest('hex');
  const session = await sessionStore().get(key, { type: 'json', consistency: 'strong' });
  if (!session || session.expiresAt <= Date.now()) {
    if (session) await sessionStore().delete(key);
    return null;
  }
  const user = state.users?.find(item => item.id === session.userId && item.username === session.username);
  if (!user || !['sysadmin', 'supervisor'].includes(user.role)) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
}

async function handleLogin(request, state) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request body' }, 400); }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const user = state.users?.find(item => {
    if (item.username !== username) return false;
    if (item.password === 'Admin@2026') {
      return Boolean(process.env.WAMY_ADMIN_PASSWORD) && password === process.env.WAMY_ADMIN_PASSWORD;
    }
    return item.password === password;
  });
  if (!user || !['sysadmin', 'supervisor'].includes(user.role)) {
    return jsonResponse({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }, 401);
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const key = createHash('sha256').update(token).digest('hex');
  await sessionStore().setJSON(key, { userId: user.id, username: user.username, expiresAt });
  return jsonResponse({ success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } }, 200, {
    'Set-Cookie': sessionCookie(token, SESSION_TTL_SECONDS)
  });
}

export default async function handler(request) {
  try {
    const pathname = new URL(request.url).pathname;
    const state = await readState(request);

    if (pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok', storage: 'netlify-blobs', persistent: true });
    }

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return await handleLogin(request, state);
    }

    if (pathname === '/api/auth/session' && request.method === 'GET') {
      const user = await currentUser(request, state);
      return jsonResponse({ configured: true, isAdmin: !!user, user });
    }

    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = cookieValue(request.headers.get('cookie'), 'wamy_session');
      if (token) await sessionStore().delete(createHash('sha256').update(token).digest('hex'));
      return jsonResponse({ success: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }

    if (pathname !== '/api/data') return jsonResponse({ error: 'Not found' }, 404);
    if (request.method === 'GET') return jsonResponse({ success: true, data: publicState(state) });
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });

    const user = await currentUser(request, state);
    if (!user) return jsonResponse({ error: 'يجب تسجيل الدخول بحساب مسؤول لتعديل البيانات.' }, 401);

    let input;
    try { input = await request.json(); } catch { return jsonResponse({ success: false, error: 'Invalid JSON' }, 400); }
    if (!Array.isArray(input.employees) || !Array.isArray(input.favorites)) {
      return jsonResponse({ success: false, error: 'Invalid data format' }, 400);
    }

    const previousUsers = Array.isArray(state.users) ? state.users : [];
    const incomingUsers = user.role === 'sysadmin' && Array.isArray(input.users) ? input.users : previousUsers;
    const users = incomingUsers.map(incoming => {
      const previous = previousUsers.find(item => item.id === incoming.id || item.username === incoming.username);
      return { ...previous, ...incoming, password: incoming.password || previous?.password || '' };
    });
    const nextState = {
      employees: input.employees,
      favorites: input.favorites,
      logs: Array.isArray(input.logs) ? input.logs : [],
      categories: Array.isArray(input.categories) ? input.categories : [],
      users,
      directoryLastUpdated: input.directoryLastUpdated || new Date().toISOString(),
      directoryDataVersion: input.directoryDataVersion || 8
    };

    await dataStore().setJSON(DATA_KEY, nextState);
    return jsonResponse({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Netlify directory storage request failed:', error);
    return jsonResponse({ success: false, error: 'Persistent storage request failed' }, 500);
  }
}

export const config = { path: '/api/*' };
