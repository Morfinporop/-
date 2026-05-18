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


// Steam аутентификация
app.get('/api/auth/steam', (req, res) => {
  // В реальном приложении здесь была бы интеграция с Steam API
  // Для демо просто возвращаем сообщение
  res.json({ ok: false, error: 'Steam аутентификация временно недоступна' });
});

// Инициализация таблиц для чатов, картинок и новостей
const initAllTables = async () => {
  if (!pool) return;
  try {
    const client = await pool.connect();
    
    // Таблица чатов
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        title TEXT NOT NULL,
        messages JSONB DEFAULT '[]',
        created_at BIGINT NOT NULL,
        FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
      );
    `);
    
    // Таблица картинок
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        image_url TEXT NOT NULL,
        caption TEXT,
        user_name TEXT,
        user_avatar TEXT,
        created_at BIGINT NOT NULL,
        FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
      );
    `);
    
    // Таблица новостей
    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        text TEXT NOT NULL,
        user_name TEXT,
        user_avatar TEXT,
        created_at BIGINT NOT NULL,
        FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
      );
    `);
    
    // Добавляем администратора если его нет
    const adminEmail = 'energoferon41@gmail.com';
    const adminCheck = await client.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4)',
        ['Администратор', adminEmail, hashedPassword, null]
      );
      console.log('✓ Администратор создан');
    }
    
    client.release();
    console.log('✓ Все таблицы готовы');
  } catch (err) {
    console.error('✗ Ошибка инициализации таблиц:', err.message);
  }
};
initAllTables();

// Сохранение чата
app.post('/api/save-chat', async (req, res) => {
  const { chat, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: true }); // Для гостей не сохраняем
  }
  
  try {
    await pool.query(
      `INSERT INTO chats (id, user_email, title, messages, created_at) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET 
         title = EXCLUDED.title,
         messages = EXCLUDED.messages,
         created_at = EXCLUDED.created_at`,
      [chat.id, userEmail.toLowerCase(), chat.title, JSON.stringify(chat.messages), chat.createdAt]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранения чата:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Загрузка чатов пользователя
app.post('/api/load-chats', async (req, res) => {
  const { userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: true, chats: [] }); // Для гостей пустой список
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM chats WHERE user_email = $1 ORDER BY created_at DESC',
      [userEmail.toLowerCase()]
    );
    const chats = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      messages: row.messages || [],
      createdAt: row.created_at
    }));
    res.json({ ok: true, chats });
  } catch (err) {
    console.error('Ошибка загрузки чатов:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Удаление чата
app.post('/api/delete-chat', async (req, res) => {
  const { chatId, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: true });
  }
  
  try {
    await pool.query('DELETE FROM chats WHERE id = $1 AND user_email = $2', [chatId, userEmail.toLowerCase()]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка удаления чата:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Сохранение картинки
app.post('/api/save-image', async (req, res) => {
  const { image, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: true });
  }
  
  try {
    await pool.query(
      `INSERT INTO images (id, user_email, image_url, caption, user_name, user_avatar, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [image.id, userEmail.toLowerCase(), image.imageUrl, image.caption, image.userName, image.userAvatar, image.createdAt]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранения картинки:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Загрузка картинок
app.get('/api/load-images', async (req, res) => {
  if (!pool) {
    return res.json({ ok: true, images: [] });
  }
  
  try {
    const result = await pool.query('SELECT * FROM images ORDER BY created_at DESC LIMIT 50');
    const images = result.rows.map(row => ({
      id: row.id,
      imageUrl: row.image_url,
      caption: row.caption,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      createdAt: row.created_at
    }));
    res.json({ ok: true, images });
  } catch (err) {
    console.error('Ошибка загрузки картинок:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Удаление картинки (только для администратора)
app.post('/api/delete-image', async (req, res) => {
  const { imageId, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: false, error: 'Не авторизован' });
  }
  
  try {
    // Проверяем, является ли пользователь администратором
    const userResult = await pool.query('SELECT email FROM users WHERE email = $1', [userEmail.toLowerCase()]);
    if (userResult.rows.length === 0 || userEmail.toLowerCase() !== 'energoferon41@gmail.com') {
      return res.json({ ok: false, error: 'Только администратор может удалять картинки' });
    }
    
    await pool.query('DELETE FROM images WHERE id = $1', [imageId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка удаления картинки:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Сохранение новости
app.post('/api/save-news', async (req, res) => {
  const { news, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: true });
  }
  
  try {
    await pool.query(
      `INSERT INTO news (id, user_email, text, user_name, user_avatar, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [news.id, userEmail.toLowerCase(), news.text, news.userName, news.userAvatar, news.createdAt]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранен��я новости:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Загрузка новостей
app.get('/api/load-news', async (req, res) => {
  if (!pool) {
    return res.json({ ok: true, news: [] });
  }
  
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC LIMIT 100');
    const news = result.rows.map(row => ({
      id: row.id,
      text: row.text,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      createdAt: row.created_at
    }));
    res.json({ ok: true, news });
  } catch (err) {
    console.error('Ошибка загрузки новостей:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Удаление новости (только для администратора)
app.post('/api/delete-news', async (req, res) => {
  const { newsId, userEmail } = req.body;
  if (!pool || !userEmail) {
    return res.json({ ok: false, error: 'Не авторизован' });
  }
  
  try {
    // Проверяем, является ли пользователь администратором
    const userResult = await pool.query('SELECT email FROM users WHERE email = $1', [userEmail.toLowerCase()]);
    if (userResult.rows.length === 0 || userEmail.toLowerCase() !== 'energoferon41@gmail.com') {
      return res.json({ ok: false, error: 'Только администратор может удалять новости' });
    }
    
    await pool.query('DELETE FROM news WHERE id = $1', [newsId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка удаления новости:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});