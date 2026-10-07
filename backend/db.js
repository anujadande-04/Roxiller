import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'roxiller.sqlite')
export const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    address TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'owner')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    address TEXT NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, user_id)
  );
`)

const seedUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)')
const adminPassword = bcrypt.hashSync('Admin@123', 10)
const userPassword = bcrypt.hashSync('Welcome@123', 10)
seedUser.run('Alex Morgan Administrator', 'admin@roverly.local', adminPassword, '1 Platform Avenue', 'admin')
seedUser.run('Oliver Grant Store Owner', 'owner@roverly.local', userPassword, '91 Kingfisher Road', 'owner')
seedUser.run('Maya Chen Community Member', 'user@roverly.local', userPassword, '28 Garden Street', 'user')
const owner = db.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").get()
const seedStore = db.prepare('INSERT OR IGNORE INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)')
seedStore.run('Harbor and Pine Home Goods', 'hello@harborpine.co', '14 Westlake Avenue', owner.id)
seedStore.run('Juniper Coffee and Bakery', 'team@juniper.cafe', '88 Mercer Street', null)
seedStore.run('Northstar Neighborhood Market', 'hi@northstarmarket.com', '203 Alder Road', null)
seedStore.run('Field Notes Books and Gifts', 'read@fieldnotesbooks.com', '5 Orchard Lane', null)
seedStore.run('Morrow Wellness Collective', 'care@morrowwellness.com', '41 Willow Square', null)
const demoUser = db.prepare("SELECT id FROM users WHERE email = 'user@roverly.local'").get()
const firstStore = db.prepare('SELECT id FROM stores ORDER BY id LIMIT 1').get()
db.prepare('INSERT OR IGNORE INTO ratings (store_id, user_id, rating) VALUES (?, ?, ?)').run(firstStore.id, demoUser.id, 5)
