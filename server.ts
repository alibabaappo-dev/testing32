import express from 'express';
import cookieParser from 'cookie-parser';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
// import { createServer as createViteServer } from 'vite'; // YE HATA DIYA HAI
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config();

// Firebase Admin Setup
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

if (!admin.apps.length && firebaseConfig.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as any),
    });
    console.log('Firebase Admin initialized');
  } catch (error) {
    console.error('Firebase Admin Error:', error);
  }
}

const app = express();
const router = express.Router();

app.use(express.json());
app.use(cookieParser());

// --- API ROUTES ---

// Health Check (Isse pata chalega backend zinda hai)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running perfectly!',
    environment: process.env.NETLIFY ? 'Netlify' : 'Local',
    timestamp: new Date().toISOString() 
  });
});

// Forgot Password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const userSnap = await admin.firestore().collection('users').where('email', '==', email).get();
    if (userSnap.empty) return res.status(404).json({ error: 'User not found' });
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    await admin.firestore().collection('passwordResets').doc(email).set({
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST, port: 465, secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER, to: email,
      subject: 'Password Reset Code',
      html: `<h2>Code: ${code}</h2>`
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Push Notifications
router.post('/send-push', async (req, res) => {
  try {
    const { title, body, targetUserId } = req.body;
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase not ready' });
    let tokens: string[] = [];
    if (targetUserId) {
      const userDoc = await admin.firestore().collection('users').doc(targetUserId).get();
      if (userDoc.exists) tokens = userDoc.data()?.fcmTokens || [];
    } else {
      const usersSnap = await admin.firestore().collection('users').get();
      usersSnap.forEach(doc => { tokens = tokens.concat(doc.data().fcmTokens || []); });
    }
    if (tokens.length === 0) return res.status(404).json({ error: 'No tokens' });
    const response = await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      tokens: [...new Set(tokens)].slice(0, 500)
    });
    res.json({ success: true, count: response.successCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MOUNTING ---
app.use('/api', router);
app.use('/.netlify/functions/api', router);

// --- SERVER LOGIC ---
async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Local Development: Vite ko dynamically load karein
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(3000, () => console.log('Dev server: http://localhost:3000'));
  } else {
    // Production (Netlify/Cloud): Static files serve karein
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
    
    // Agar Netlify nahi hai toh port 3000 par chale
    if (!process.env.NETLIFY) {
      app.listen(3000, () => console.log('Prod server: http://localhost:3000'));
    }
  }
}

start().catch(console.error);

export { app };
