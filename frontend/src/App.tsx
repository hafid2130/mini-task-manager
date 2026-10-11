import React, { useEffect, useState } from 'react';
import axios from 'axios';

type Status = 'to_do' | 'pending' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
}

interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  oldStatus: Status;
  newStatus: Status;
  timestamp: string;
}

const ACTORS = ['john.doe', 'sarah.connor', 'alex.smith'];
const API_BASE = 'http://localhost:5000';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedActor, setSelectedActor] = useState(ACTORS[0]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks`);
      setTasks(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await axios.post(`${API_BASE}/tasks`, { title, description });
      setTitle(''); setDescription('');
      fetchTasks();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed');
    }
  };

  const handleStatusChange = async (id: string, current: Status) => {
    const flow: Record<Status, Status> = {
      to_do: 'pending',
      pending: 'in_progress',
      in_progress: 'done',
      done: 'done',
    };
    const next = flow[current];
    if (next === current) return;
    try {
      await axios.put(`${API_BASE}/tasks/${id}/status`, { newStatus: next, actor: selectedActor });
      fetchTasks();
      if (activeTaskId === id) fetchLogs(id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Transition failed');
    }
  };

  const fetchLogs = async (id: string) => {
    setActiveTaskId(id);
    try {
      const res = await axios.get(`${API_BASE}/tasks/${id}/audit-logs`);
      setLogs(res.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h2>Mini Task Manager & Audit Log</h2>
      {errorMsg && <div style={{ background: '#ffd2d2', color: '#900', padding: 10, marginBottom: 10 }}>{errorMsg}</div>}

      <div style={{ marginBottom: 15 }}>
        <label>Actor: </label>
        <select value={selectedActor} onChange={(e) => setSelectedActor(e.target.value)}>
          {ACTORS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1, padding: 6 }} />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={{ flex: 2, padding: 6 }} />
        <button type="submit" style={{ padding: '6px 12px' }}>Add Task</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: 8 }}><b>{t.title}</b><br/><small>{t.description}</small></td>
              <td style={{ padding: 8 }}>{t.status}</td>
              <td style={{ padding: 8, display: 'flex', gap: 5 }}>
                {t.status !== 'done' && <button onClick={() => handleStatusChange(t.id, t.status)}>Next ➔</button>}
                <button onClick={() => fetchLogs(t.id)}>Logs</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeTaskId && (
        <div style={{ marginTop: 20, background: '#f9f9f9', padding: 15, border: '1px solid #ccc' }}>
          <h4>Audit Logs for Task: {activeTaskId}</h4>
          <ul>
            {logs.map(l => (
              <li key={l.id}>User <b>{l.actor}</b> changed from <code>{l.oldStatus}</code> to <code>{l.newStatus}</code> at {new Date(l.timestamp).toLocaleTimeString()}</li>
            ))}
          </ul>
          <button onClick={() => setActiveTaskId(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
