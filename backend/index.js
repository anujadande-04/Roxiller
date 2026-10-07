import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db.js'
import { validateRating, validateUser } from './validation.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.JWT_SECRET || 'roxiller-development-secret'
app.use(cors())
app.use(express.json())

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, address: user.address, role: user.role })
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' })
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try { req.auth = jwt.verify(token, jwtSecret); next() } catch { return res.status(401).json({ error: 'Session expired.' }) }
}
function allow(...roles) { return (req, res, next) => roles.includes(req.auth.role) ? next() : res.status(403).json({ error: 'You do not have permission for this action.' }) }
function sendValidation(res, errors) { return res.status(400).json({ error: 'Please correct the highlighted fields.', fields: errors }) }

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.post('/api/auth/register', (req, res) => {
  const { errors, value } = validateUser(req.body)
  if (Object.keys(errors).length) return sendValidation(res, errors)
  const role = ['admin', 'owner', 'user'].includes(req.body.role) ? req.body.role : 'user'
  try {
    const result = db.prepare('INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)').run(value.name, value.email, bcrypt.hashSync(value.password, 12), value.address, role)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ user: publicUser(user), token: tokenFor(user) })
  } catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Email is already registered.' : 'Could not create account.' }) }
})
app.post('/api/auth/login', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(req.body.email || '').trim())
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash)) return res.status(401).json({ error: 'Invalid email or password.' })
  if (req.body.role && req.body.role !== user.role) return res.status(403).json({ error: 'This account does not have the selected role.' })
  res.json({ user: publicUser(user), token: tokenFor(user) })
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.sub)) }))
app.patch('/api/users/me/password', auth, (req, res) => {
  const { errors, value } = validateUser({ name: 'Valid Password Change Account', address: 'Password update', email: 'valid@example.com', password: req.body.password })
  if (errors.password) return sendValidation(res, { password: errors.password })
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(value.password, 12), req.auth.sub)
  res.json({ message: 'Password updated.' })
})

app.get('/api/stores', auth, (req, res) => {
  const stores = db.prepare(`SELECT s.*, ROUND(AVG(r.rating), 1) AS rating, COUNT(r.id) AS reviews, ur.rating AS userRating FROM stores s LEFT JOIN ratings r ON r.store_id = s.id LEFT JOIN ratings ur ON ur.store_id = s.id AND ur.user_id = ? GROUP BY s.id ORDER BY s.name`).all(req.auth.sub)
  res.json({ stores })
})
app.post('/api/stores/:storeId/ratings', auth, allow('user'), (req, res) => {
  const rating = validateRating(req.body.rating)
  if (!rating) return sendValidation(res, { rating: 'Rating must be an integer from 1 to 5.' })
  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(req.params.storeId)
  if (!store) return res.status(404).json({ error: 'Store not found.' })
  db.prepare(`INSERT INTO ratings (store_id, user_id, rating) VALUES (?, ?, ?) ON CONFLICT(store_id, user_id) DO UPDATE SET rating = excluded.rating, updated_at = CURRENT_TIMESTAMP`).run(store.id, req.auth.sub, rating)
  res.json({ message: 'Rating saved.', rating })
})

app.get('/api/owner/dashboard', auth, allow('owner'), (req, res) => {
  const store = db.prepare(`SELECT s.id, s.name, ROUND(AVG(r.rating), 1) AS averageRating, COUNT(r.id) AS totalRatings FROM stores s LEFT JOIN ratings r ON r.store_id = s.id WHERE s.owner_id = ? GROUP BY s.id`).get(req.auth.sub)
  const ratings = store ? db.prepare(`SELECT r.rating, r.created_at AS createdAt, u.name, u.email FROM ratings r JOIN users u ON u.id = r.user_id WHERE r.store_id = ? ORDER BY r.created_at DESC`).all(store.id) : []
  res.json({ store, ratings })
})

app.get('/api/admin/stats', auth, allow('admin'), (_req, res) => {
  res.json({ users: db.prepare('SELECT COUNT(*) AS count FROM users').get().count, stores: db.prepare('SELECT COUNT(*) AS count FROM stores').get().count, ratings: db.prepare('SELECT COUNT(*) AS count FROM ratings').get().count })
})
app.get('/api/admin/users', auth, allow('admin'), (_req, res) => res.json({ users: db.prepare('SELECT id, name, email, address, role, created_at AS createdAt FROM users ORDER BY name').all() }))
app.post('/api/admin/users', auth, allow('admin'), (req, res) => {
  const { errors, value } = validateUser(req.body)
  if (Object.keys(errors).length) return sendValidation(res, errors)
  const role = ['admin', 'user', 'owner'].includes(req.body.role) ? req.body.role : 'user'
  try { const result = db.prepare('INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)').run(value.name, value.email, bcrypt.hashSync(value.password, 12), value.address, role); res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)) }) } catch { res.status(409).json({ error: 'Email is already registered.' }) }
})
app.get('/api/admin/stores', auth, allow('admin'), (_req, res) => res.json({ stores: db.prepare(`SELECT s.*, ROUND(AVG(r.rating), 1) AS rating, COUNT(r.id) AS reviews FROM stores s LEFT JOIN ratings r ON r.store_id = s.id GROUP BY s.id ORDER BY s.name`).all() }))
app.post('/api/admin/stores', auth, allow('admin'), (req, res) => {
  const { errors, value } = validateUser({ ...req.body, password: 'Valid@123' }, { passwordRequired: false })
  if (errors.name || errors.email || errors.address) return sendValidation(res, errors)
  try { const result = db.prepare('INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)').run(value.name, value.email, value.address, req.body.ownerId || null); res.status(201).json({ store: db.prepare('SELECT * FROM stores WHERE id = ?').get(result.lastInsertRowid) }) } catch { res.status(409).json({ error: 'Store email is already registered.' }) }
})
app.post('/api/auth/logout', auth, (_req, res) => res.json({ message: 'Logged out.' }))

app.listen(port, () => console.log(`Roverly API listening on http://localhost:${port}`))
