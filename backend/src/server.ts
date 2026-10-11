import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = path.join(__dirname, 'data.json');
type Status = 'to_do' | 'pending' | 'in_progress' | 'done';

interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  oldStatus: Status;
  newStatus: Status;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
}

interface Database {
  tasks: Task[];
  auditLogs: AuditLog[];
}

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  to_do: ['pending'],
  pending: ['in_progress'],
  in_progress: ['done'],
  done: [],
};

function readDb(): Database {
  if (!fs.existsSync(DATA_FILE)) {
    const initial: Database = { tasks: [], auditLogs: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeDb(data: Database) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/tasks', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.tasks);
});

app.post('/tasks', (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const db = readDb();
  const newTask: Task = {
    id: Date.now().toString(),
    title,
    description: description || '',
    status: 'to_do',
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(newTask);
  writeDb(db);
  res.status(201).json(newTask);
});

app.put('/tasks/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newStatus, actor } = req.body as { newStatus: Status; actor: string };
  if (!actor) return res.status(400).json({ error: 'Actor is required' });
  const db = readDb();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === newStatus) return res.json({ message: 'Up to date', task });

  const allowed = VALID_TRANSITIONS[task.status] || [];
  if (!allowed.includes(newStatus)) {
    return res.status(400).json({ error: `Invalid transition from ${task.status} to ${newStatus}` });
  }

  const oldStatus = task.status;
  task.status = newStatus;
  const newLog: AuditLog = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    taskId: task.id,
    actor,
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.push(newLog);
  writeDb(db);
  res.json({ task, log: newLog });
});

app.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  db.tasks.splice(idx, 1);
  writeDb(db);
  res.json({ message: 'Deleted' });
});

app.get('/tasks/:id/audit-logs', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();
  res.json(db.auditLogs.filter((l) => l.taskId === id));
});

app.listen(5000, () => console.log('Server running on port 5000'));
