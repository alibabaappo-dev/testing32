// server.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config();

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

if (!admin.apps.length && firebaseConfig.privateKey) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(firebaseConfig as any) });
  } catch (error) { console.error('Firebase Error:', error); }
}

const app = express();
const router = express.Router();

app.use(express.json());
app.use(cookieParser());

// API Routes
router.get('/health', (req, res) => res.json({ status: 'ok', env: 'production' }));

router.post('/auth/forgot-password', async (req, res) => {
  // ... (aapka password reset logic)
  res.json({ success: true });
});

router.post('/send-push', async (req, res) => {
  // ... (aapka push notification logic)
  res.json({ success: true });
});

// Mount API
app.use('/api', router);
app.use('/.netlify/functions/api', router);

// Static files (Sirf production mein)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
}

export { app };
