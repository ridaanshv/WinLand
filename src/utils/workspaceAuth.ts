import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/tasks',
];

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Strictly in-memory token cache — never persisted in localStorage or sessionStorage
let cachedAccessToken: string | null = null;

export function initWorkspaceAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutWorkspace(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
}

// --- Gmail API helpers ---
export interface GmailMessagePreview {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export async function fetchRecentGmailMessages(
  accessToken: string,
  maxResults = 6
): Promise<GmailMessagePreview[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API error (${listRes.status}): ${errText}`);
  }
  const listData = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> };
  const refs = listData.messages ?? [];
  if (refs.length === 0) return [];

  const detailed = await Promise.all(
    refs.map(async (ref) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) return null;
      const msg = (await msgRes.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: getHeader('Subject') || '(No subject)',
        from: getHeader('From') || 'Unknown sender',
        snippet: msg.snippet || '',
        date: getHeader('Date') || 'Just now',
        unread: Array.isArray(msg.labelIds) && msg.labelIds.includes('UNREAD'),
      };
    })
  );

  return detailed.filter((m): m is GmailMessagePreview => m !== null);
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  const encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Unable to send email (${res.status}): ${errText}`);
  }
}

// --- Google Tasks API helpers ---
export interface GoogleTaskRecord {
  id: string;
  title: string;
  due?: string;
  status: 'needsAction' | 'completed';
  listId: string;
}

export interface GoogleTaskListOption {
  id: string;
  title: string;
}

export async function fetchGoogleTasks(
  accessToken: string,
  targetListId?: string
): Promise<{
  listId: string;
  listTitle: string;
  lists: GoogleTaskListOption[];
  tasks: GoogleTaskRecord[];
}> {
  const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listsRes.ok) {
    const errText = await listsRes.text();
    throw new Error(`Google Tasks API error (${listsRes.status}): ${errText}`);
  }
  const listsData = (await listsRes.json()) as {
    items?: Array<{ id: string; title: string }>;
  };
  const allLists: GoogleTaskListOption[] = (listsData.items ?? []).map((l) => ({
    id: l.id,
    title: l.title,
  }));
  const activeList =
    (targetListId ? allLists.find((l) => l.id === targetListId) : undefined) ?? allLists[0];

  if (!activeList) {
    return { listId: '@default', listTitle: 'My Tasks', lists: [], tasks: [] };
  }

  const tasksRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(activeList.id)}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!tasksRes.ok) {
    const errText = await tasksRes.text();
    throw new Error(`Failed loading tasks (${tasksRes.status}): ${errText}`);
  }
  const tasksData = (await tasksRes.json()) as {
    items?: Array<{ id: string; title: string; due?: string; status: 'needsAction' | 'completed' }>;
  };

  return {
    listId: activeList.id,
    listTitle: activeList.title,
    lists: allLists,
    tasks: (tasksData.items ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due,
      status: t.status,
      listId: activeList.id,
    })),
  };
}

export async function createGoogleTask(
  accessToken: string,
  listId: string,
  title: string
): Promise<GoogleTaskRecord> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to create task (${res.status})`);
  }
  const created = (await res.json()) as {
    id: string;
    title: string;
    due?: string;
    status: 'needsAction' | 'completed';
  };
  return { ...created, listId };
}

export async function updateGoogleTaskStatus(
  accessToken: string,
  listId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: completed ? 'completed' : 'needsAction' }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to update task (${res.status})`);
  }
}

export async function deleteGoogleTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to delete task (${res.status})`);
  }
}

export async function moveGoogleTask(
  accessToken: string,
  listId: string,
  taskId: string,
  previousTaskId?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (previousTaskId) {
    params.set('previous', previousTaskId);
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}/move${qs}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to reorder Google Task (${res.status})`);
  }
}
