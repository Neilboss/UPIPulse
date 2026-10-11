import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'upipulse.db');
  dbInstance = new Database(dbPath);

  // Enable foreign keys and WAL mode for better concurrency
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');

  initSchema(dbInstance);

  return dbInstance;
}

function initSchema(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);
  }

  // Seed default categories if none exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, icon, color, monthly_budget)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultCategories = [
      ['cat-food', 'Food', 'Utensils', '#f97316', 8000],
      ['cat-travel', 'Travel', 'Car', '#06b6d4', 3000],
      ['cat-shopping', 'Shopping', 'ShoppingBag', '#ec4899', 5000],
      ['cat-utilities', 'Utilities', 'Zap', '#eab308', 4000],
      ['cat-investment', 'Investment', 'TrendingUp', '#10b981', 10000],
      ['cat-p2p', 'P2P', 'Users', '#8b5cf6', 3000],
      ['cat-other', 'Other', 'Tag', '#64748b', 2000],
    ];

    const insertMany = db.transaction((categories) => {
      for (const cat of categories) {
        insertCat.run(...cat);
      }
    });

    insertMany(defaultCategories);
  }

  // Seed default settings if none exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const initialApiKey = 'upi_' + crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO settings (id, api_key, monthly_budget_total, is_onboarded, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run('settings_default', initialApiKey, 35000, now, now);
  } else {
    // Migration check: ensure is_onboarded column exists
    const columns = db.prepare("PRAGMA table_info(settings)").all() as { name: string }[];
    const hasOnboarded = columns.some((col) => col.name === 'is_onboarded');
    if (!hasOnboarded) {
      db.prepare('ALTER TABLE settings ADD COLUMN is_onboarded INTEGER NOT NULL DEFAULT 0').run();
    }
  }
}
