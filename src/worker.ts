import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  VAULT: R2Bucket
  DB: D1Database
  SETTINGS: KVNamespace
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()
app.use('/*', cors())

// Notes CRUD - نفس منطق الأصلي بس على R2
app.get('/api/notes', async (c) => {
  const res = await c.env.DB.prepare('SELECT path, title, updated_at FROM notes ORDER BY updated_at DESC').all()
  return c.json(res.results)
})

app.get('/api/notes/*', async (c) => {
  const path = c.req.path.replace('/api/notes/', '')
  const obj = await c.env.VAULT.get(path)
  if (!obj) return c.json({ error: 'not found' }, 404)
  return c.json({ path, content: await obj.text() })
})

app.put('/api/notes/*', async (c) => {
  const path = c.req.path.replace('/api/notes/', '')
  const { content } = await c.req.json()
  await c.env.VAULT.put(path, content)
  const title = content.match(/^#\s+(.+)/m)?.[1] || path
  await c.env.DB.prepare(
    'INSERT INTO notes (path, title, content, updated_at) VALUES (?, ?, ?, datetime("now")) ON CONFLICT(path) DO UPDATE SET title=?, content=?, updated_at=datetime("now")'
  ).bind(path, title, content, title, content).run()
  return c.json({ ok: true })
})

app.delete('/api/notes/*', async (c) => {
  const path = c.req.path.replace('/api/notes/', '')
  await c.env.VAULT.delete(path)
  await c.env.DB.prepare('DELETE FROM notes WHERE path=?').bind(path).run()
  return c.json({ ok: true })
})

app.get('/api/search', async (c) => {
  const q = c.req.query('q') || ''
  const res = await c.env.DB.prepare('SELECT path, title FROM notes_fts WHERE notes_fts MATCH ? LIMIT 20').bind(q).all()
  return c.json(res.results)
})

app.get('/api/settings', async (c) => {
  const s = await c.env.SETTINGS.get('user_settings', 'json')
  return c.json(s || { theme: 'default', scale: 100 })
})

app.put('/api/settings', async (c) => {
  const body = await c.req.json()
  await c.env.SETTINGS.put('user_settings', JSON.stringify(body))
  return c.json({ ok: true })
})

// Serve frontend (SPA)
app.get('*', async (c) => {
  return await c.env.ASSETS.fetch(c.req.raw)
})

export default app
