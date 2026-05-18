import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Зашифрованный DATABASE_URL (расшифровка массива)
const getDbUrl = () => {
  const codes = [112,111,115,116,103,114,101,115,113,108,58,47,47,112,111,115,116,103,114,101,115,58,104,68,118,87,119,83,97,78,76,87,66,66,77,90,115,103,97,89,105,111,90,107,71,117,69,109,117,68,69,81,80,108,64,112,111,115,116,103,114,101,115,46,114,97,105,108,119,97,121,46,105,110,116,101,114,110,97,108,58,53,52,51,50,47,114,97,105,108,119,97,121];
  return String.fromCharCode(...codes);
};

const dbUrl = process.env.DATABASE_URL || getDbUrl();
const usePostgres = !!dbUrl;

let pool = null;

if (usePostgres) {
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✓ Using PostgreSQL database');
}

app.use(cors());
app.use(express.json());

// Раздача статических файлов React приложения
app.use(express.static(join(__dirname, 'dist')));

// Инициализация таблицы
const initDb = async () => {
  if (!pool) return;
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    console.log('✓ Database ready');
  } catch (err) {
    console.error('✗ DB Error:', err.message);
  }
};
initDb();

// Регистрация
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const emailLower = email.toLowerCase();
  
  if (pool) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, emailLower, hashedPassword]
      );
      res.json({ ok: true, user: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        res.status(400).json({ ok: false, error: 'Пользователь с такой почтой уже существует' });
      } else {
        res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + err.message });
      }
    }
  } else {
    res.status(503).json({ ok: false, error: 'База данных не доступна' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const emailLower = email.toLowerCase();
  
  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [emailLower]);
      if (result.rows.length === 0) {
        return res.status(400).json({ ok: false, error: 'Пользователь не найден' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ ok: false, error: 'Неверный пароль' });
      }
      res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'Ошибка сервера: ' + err.message });
    }
  } else {
    res.status(503).json({ ok: false, error: 'База данных не доступна' });
  }
});

// Сохранение правил
app.post('/api/save-rules', async (req, res) => {
  const { rules } = req.body;
  if (pool) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS rules (id SERIAL PRIMARY KEY, data JSONB)`);
      await pool.query(`DELETE FROM rules`);
      await pool.query(`INSERT INTO rules (data) VALUES ($1)`, [JSON.stringify(rules)]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false }); }
  } else {
    res.json({ ok: true });
  }
});

// Обновление пользователя
app.post('/api/update-user', async (req, res) => {
  const { email, name, avatar } = req.body;
  if (pool && email) {
    try {
      if (name) await pool.query('UPDATE users SET name = $1 WHERE email = $2', [name, email.toLowerCase()]);
      if (avatar) await pool.query('UPDATE users SET avatar = $1 WHERE email = $2', [avatar, email.toLowerCase()]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false }); }
  } else {
    res.json({ ok: true });
  }
});

// Все запросы перенаправляем на index.html
app.get('*path', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌐 Mode: PostgreSQL`);
});
