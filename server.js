import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import 'dotenv/config';

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 8080;

// Настройка подключения к БД Railway
if (!process.env.DATABASE_URL) {
  console.error('CRITICAL ERROR: DATABASE_URL is not defined in environment variables!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());

// Инициализация таблицы при запуске
const initDb = async () => {
  if (!process.env.DATABASE_URL) return;
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
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
    console.log('Database table verified/created');
  } catch (err) {
    console.error('Database connection failed. Check if your PostgreSQL service is running and linked.');
    console.error('Error details:', err.message);
  }
};
initDb();

// Регистрация
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email.toLowerCase(), hashedPassword]
    );
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ ok: false, error: 'Пользователь с такой почтой уже существует' });
    } else {
      console.error(err);
      res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
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
    console.error(err);
    res.status(500).json({ ok: false, error: 'Ошибка сервера' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
