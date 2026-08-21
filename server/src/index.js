import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import SQLiteStoreFactory from 'better-sqlite3-session-store';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { initDB, getDB } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env') });
import instancesRouter from './routes/instances.js';
import templatesRouter from './routes/templates.js';
import messagesRouter from './routes/messages.js';
import configRouter from './routes/config.js';
import dataRouter from './routes/data.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

const sendBatchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos envios em sequência. Aguarde 1 minuto.' },
});

app.use('/api/messages/send-batch', sendBatchLimiter);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

initDB();
const SQLiteStore = SQLiteStoreFactory(session);
app.use(session({
  secret: process.env.SECRET_KEY || 'secret-dev-key',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({
    db: getDB(),
    tableName: 'sessions',
    expiration: 24 * 60 * 60 * 1000,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/health', (req, res) => { res.json({ status: 'ok' }); });
app.use('/api/instances', instancesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/config', configRouter);
app.use('/api/data', dataRouter);

const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  app.use('/whatsapp', express.static(publicDir));
  app.get('/whatsapp/{*path}', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
  app.get('/', (req, res) => {
    res.redirect('/whatsapp');
  });
}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
