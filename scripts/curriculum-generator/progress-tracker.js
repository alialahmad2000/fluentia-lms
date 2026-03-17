// ─── Progress Tracker — resume capability ─────────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, 'output', 'progress.json');

const CONTENT_TYPES = [
  'reading_a', 'reading_b', 'grammar', 'writing',
  'listening', 'speaking', 'irregular_verbs', 'assessment'
];

export function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch { /* corrupted, start fresh */ }
  }
  return {
    last_updated: new Date().toISOString(),
    total_units: 72,
    completed_units: 0,
    units: {},
    total_cost_usd: 0,
  };
}

export function saveProgress(progress) {
  progress.last_updated = new Date().toISOString();
  // Count completed units
  let completed = 0;
  for (const unitKey of Object.keys(progress.units)) {
    const u = progress.units[unitKey];
    if (CONTENT_TYPES.every(t => u[t] === 'done')) completed++;
  }
  progress.completed_units = completed;
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

export function isCompleted(progress, unitKey, contentType) {
  return progress.units[unitKey]?.[contentType] === 'done';
}

export function markCompleted(progress, unitKey, contentType) {
  if (!progress.units[unitKey]) {
    progress.units[unitKey] = {};
    for (const t of CONTENT_TYPES) {
      progress.units[unitKey][t] = 'pending';
    }
  }
  progress.units[unitKey][contentType] = 'done';
  saveProgress(progress);
}

export function markFailed(progress, unitKey, contentType, errorMsg) {
  if (!progress.units[unitKey]) {
    progress.units[unitKey] = {};
    for (const t of CONTENT_TYPES) {
      progress.units[unitKey][t] = 'pending';
    }
  }
  progress.units[unitKey][contentType] = `failed: ${errorMsg}`;
  saveProgress(progress);
}

export function getProgressSummary(progress) {
  const total = Object.keys(progress.units).length;
  let done = 0, failed = 0, pending = 0;
  for (const unitKey of Object.keys(progress.units)) {
    const u = progress.units[unitKey];
    for (const t of CONTENT_TYPES) {
      if (u[t] === 'done') done++;
      else if (u[t]?.startsWith('failed')) failed++;
      else pending++;
    }
  }
  return { total, done, failed, pending, totalItems: total * CONTENT_TYPES.length };
}
