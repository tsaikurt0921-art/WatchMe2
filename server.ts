import express from "express";
import compression from "compression";
import { fileURLToPath } from "url";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import "dotenv/config";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Instant-kill for bots and crawlers to minimize Cloud Run CPU usage duration
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  // Check for common bots, crawlers, and social media scrapers
  if (/bot|crawler|spider|facebookexternalhit|googlebot|bingbot|slurp|ia_archiver/i.test(ua)) {
    return res.status(403).send('Access denied for crawlers.');
  }
  next();
});

// Enable Gzip compression to reduce transfer size and CPU usage duration
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Admin (Lazy)
let db: any = null;

function getDb() {
  if (db) return db;
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      db = getFirestore(dbId);
      
      console.log(`[Firebase Admin] Lazy Initialized. Project: ${firebaseConfig.projectId}, Database: ${dbId}`);
      return db;
    } catch (err) {
      console.error("[Firebase Admin] Initialization error:", err);
      db = getFirestore();
      return db;
    }
  }
  return null;
}

// ECPay Helper Functions
function generateCheckMacValue(params: any, hashKey: string, hashIV: string) {
  // 1. Sort keys alphabetically
  const sortedKeys = Object.keys(params).sort();
  
  // 2. Build query string
  const query = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
    
  // 3. Prepend HashKey and append HashIV
  const rawString = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;

  // 5. Replace specific characters to match ECPay's requirement
  // Note: encodeURIComponent doesn't encode ! ( ) * - . _ ~
  // But ECPay documentation often shows them being encoded and then replaced.
  // The most critical one is %20 -> + and ~ -> %7e
  let encoded = encodeURIComponent(rawString).toLowerCase();
  encoded = encoded
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e') // Critical fix for Node.js/TypeScript
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');

  // 6. SHA256 -> Uppercase
  const hash = crypto.createHash('sha256').update(encoded).digest('hex');
  return hash.toUpperCase();
}

async function sendNotificationEmail(userEmail: string, data: { expiryDate: string, duration: string }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL } = process.env;
  
  if (!SMTP_HOST || !SMTP_PASS) {
    throw new Error("SMTP_HOST 或 SMTP_PASS 環境變數缺失");
  }

  // Get settings from Firestore
  const settingsSnap = await db.collection('settings').doc('global').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {
    emailSender: 'Broadme',
    emailSubject: '您的 Broadme 授權序號',
    emailTemplate: '感謝您的購買！您的帳號使用Broadme-ADS時間到期日為{{時間到期日}}\n時長：{{duration}} 個月'
  };

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  let subject = settings.emailSubject;
  let text = settings.emailTemplate;

  // Replace placeholders
  const replacements: { [key: string]: string } = {
    '{{時間到期日}}': data.expiryDate,
    '{{expiry_date}}': data.expiryDate, // Legacy support
    '{{duration}}': data.duration,
    '{{license_key}}': '自動開通'
  };

  Object.keys(replacements).forEach(key => {
    // Escape special characters in key for regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    subject = subject.replace(new RegExp(escapedKey, 'g'), replacements[key]);
    text = text.replace(new RegExp(escapedKey, 'g'), replacements[key]);
  });

  // Create HTML version with preserved line breaks
  const htmlContent = text.replace(/\n/g, '<br>');

  console.log(`[Email] Final template after replacement: \nSubject: ${subject}\nContent: ${text.substring(0, 100)}...`);

  await transporter.sendMail({
    from: `"${settings.emailSender || 'Broadme'}" <${SMTP_FROM_EMAIL || SMTP_USER}>`,
    to: userEmail,
    subject: subject,
    text: text,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">${subject}</h2>
        <div style="padding: 20px 0; font-size: 16px; white-space: pre-wrap;">
          ${htmlContent}
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
          此信件由系統自動發出，請勿直接回覆。<br>
          © ${new Date().getFullYear()} Broadme 客服團隊
        </div>
      </div>
    `,
  });

  console.log(`[Email] Notification sent to ${userEmail}`);
  return true;
}

async function startServer() {
  const PORT = 3000;

  // Use higher limit for large template payloads
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Test Email Endpoint
  app.post("/api/email/test", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const firestoredb = getDb();
    if (!firestoredb) return res.status(500).json({ error: "Database not available" });

    try {
      await sendNotificationEmail(email, {
        expiryDate: new Date().toLocaleDateString('zh-TW'),
        duration: "測試"
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Email Test] Error:", error);
      res.status(500).json({ error: error.message || "發送失敗" });
    }
  });

  // ECPay Payment Endpoint
  app.post("/api/payment/ecpay", async (req, res) => {
    const { planId, userId, userEmail } = req.body;
    const firestoredb = getDb();
    if (!firestoredb) return res.status(500).json({ error: "Database not available" });
    
    // 1. Get MerchantID from Env
    const MERCHANT_ID = (process.env.ECPAY_MERCHANT_ID || '').trim();
    const testIDs = ['2000132', '3002607', '2000933'];
    
    // 2. Determine if we are in Test or Production
    let isActuallyTest = false;
    let finalMerchantID = MERCHANT_ID;

    if (!MERCHANT_ID) {
      console.warn("[ECPay] ECPAY_MERCHANT_ID is MISSING! Defaulting to test ID 3002607.");
      finalMerchantID = '3002607';
      isActuallyTest = true;
    } else {
      isActuallyTest = testIDs.includes(MERCHANT_ID);
    }

    // 3. Determine ECPay URL
    let ECPAY_URL = process.env.ECPAY_URL;
    if (!ECPAY_URL || ECPAY_URL.trim() === "" || ECPAY_URL.includes('stage')) {
      if (!isActuallyTest) {
        ECPAY_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
        console.log(`[ECPay] Production Mode: ${ECPAY_URL}`);
      } else {
        ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
        console.log(`[ECPay] Test Mode: ${ECPAY_URL}`);
      }
    }
    
    // Diagnostic logging
    console.log(`[ECPay] Final MerchantID: "${finalMerchantID}"`);
    console.log(`[ECPay] Env Keys Found:`, Object.keys(process.env).filter(k => k.includes('ECPAY')));
    
    // Robustness: If user accidentally pasted "ECPAY_URL=https://..." into the env var
    if (ECPAY_URL.includes('ECPAY_URL=')) {
      ECPAY_URL = ECPAY_URL.split('ECPAY_URL=')[1].trim();
    }
    // Robustness: If user pasted the whole line from the question including vendor-stage URL
    if (ECPAY_URL.includes(' ')) {
      const parts = ECPAY_URL.split(' ');
      const actualUrl = parts.find(p => p.startsWith('https://payment'));
      if (actualUrl) ECPAY_URL = actualUrl;
    }

    // Ensure official casing for the endpoint
    if (ECPAY_URL.toLowerCase().includes('aiocheckout')) {
      ECPAY_URL = ECPAY_URL.replace(/aiocheckout/i, 'AioCheckOut');
    }

    const isStage = ECPAY_URL.includes('stage');
    
    const HASH_KEY = process.env.ECPAY_HASH_KEY || (isStage ? '5294y06JbCWpE5vM' : '');
    const HASH_IV = process.env.ECPAY_HASH_IV || (isStage ? 'v77hoKGq4kWxJtE5' : '');

    // Check for default stage keys in production
    if (!isStage && (HASH_KEY === '5294y06JbCWpE5vM' || HASH_IV === 'v77hoKGq4kWxJtE5')) {
      console.warn("[ECPay] WARNING: Using Stage HashKey/HashIV on a Production URL!");
    }
    
    // Auto-detect APP_URL if not provided
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const currentUrl = `${protocol}://${host}`;
    const APP_URL = (process.env.APP_URL || currentUrl).replace(/\/$/, "");

    console.log(`[ECPay] Environment: ${isStage ? 'STAGE' : 'PRODUCTION'}`);
    console.log(`[ECPay] MerchantID: ${MERCHANT_ID}`);
    console.log(`[ECPay] APP_URL (HOST): ${APP_URL}`);

    // Credential Mismatch Detection
    if (!isStage && MERCHANT_ID === '2000132') {
      console.error("[ECPay] Mismatch: Using Stage MerchantID on Production URL!");
      return res.status(400).json({ error: "環境設定錯誤：您正在使用正式環境網址，但 MerchantID 卻是測試用的 (2000132)。請在環境變數中填寫正確的正式金鑰。" });
    }

    if (isStage && MERCHANT_ID !== '2000132' && MERCHANT_ID.length === 7) {
      // Production IDs are usually 7 digits, Stage is 2000132
      console.warn("[ECPay] Warning: You might be using a Production MerchantID on a Stage URL.");
    }

    if (!MERCHANT_ID || !HASH_KEY || !HASH_IV || !APP_URL) {
      console.error("[ECPay] Missing configuration:", { MERCHANT_ID: !!MERCHANT_ID, HASH_KEY: !!HASH_KEY, HASH_IV: !!HASH_IV, APP_URL: !!APP_URL });
      return res.status(500).json({ error: "ECPay configuration missing on server. Please check Environment Variables." });
    }

    try {
      console.log(`[ECPay] Received payment request for planId: ${planId}, userId: ${userId}`);
      
      // Fetch plan details from Firestore
      const planRef = db.collection('pricingPlans').doc(planId);
      const planDoc = await planRef.get();
      
      if (!planDoc.exists) {
        console.error(`[ECPay] Plan not found in Firestore: ${planId}`);
        return res.status(404).json({ error: `找不到方案 (ID: ${planId})。請確認管理後台已儲存該方案。` });
      }
      
      const plan = planDoc.data();
      console.log(`[ECPay] Fetched plan data from Firestore:`, JSON.stringify(plan));

      const amount = Math.floor(plan?.discountPrice || plan?.originalPrice || 0);
      const duration = plan?.durationMonths || 1;

      console.log(`[ECPay] Final payment details: amount=${amount}, duration=${duration} months`);

      if (amount < 10) {
        return res.status(400).json({ error: "綠界交易金額最低需為 NT$ 10，請調整方案價格。" });
      }

      // Unique Trade No (max 20 chars)
      const MerchantTradeNo = `T${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000)}`;
      
      // ECPay requires UTC+8 (Taiwan Time)
      const now = new Date();
      const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const MerchantTradeDate = `${taiwanTime.getUTCFullYear()}/${(taiwanTime.getUTCMonth() + 1).toString().padStart(2, '0')}/${taiwanTime.getUTCDate().toString().padStart(2, '0')} ${taiwanTime.getUTCHours().toString().padStart(2, '0')}:${taiwanTime.getUTCMinutes().toString().padStart(2, '0')}:${taiwanTime.getUTCSeconds().toString().padStart(2, '0')}`;

      const baseParams: any = {
        MerchantID: finalMerchantID,
        MerchantTradeNo: MerchantTradeNo,
        MerchantTradeDate: MerchantTradeDate,
        PaymentType: 'aio',
        TotalAmount: amount,
        TradeDesc: `Broadme ${duration} Month Plan`, 
        ItemName: `Broadme ${duration} Month Plan`, 
        ReturnURL: `${APP_URL}/api/payment/callback`,
        ChoosePayment: 'ALL',
        EncryptType: 1,
        OrderResultURL: `${APP_URL}/pricing`,
        CustomField1: userId,
        CustomField2: duration.toString(), // Store duration here
        CustomField3: planId, // Store planId here
        NeedExtraPaidInfo: 'Y',
        DeviceSource: 'P'
      };

      console.log(`[ECPay] Generating CheckMacValue for Amount: ${amount}`);
      baseParams.CheckMacValue = generateCheckMacValue(baseParams, HASH_KEY, HASH_IV);

      console.log(`[ECPay] Success. Redirecting to: ${ECPAY_URL}`);
      res.json({
        url: ECPAY_URL,
        params: baseParams
      });
    } catch (error: any) {
      console.error("ECPay generate error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ECPay Callback Endpoint (Server-to-Server)
  app.post("/api/payment/callback", async (req, res) => {
    const data = req.body;
    const HASH_KEY = process.env.ECPAY_HASH_KEY;
    const HASH_IV = process.env.ECPAY_HASH_IV;

    if (!HASH_KEY || !HASH_IV) {
      return res.status(500).send("0|ConfigMissing");
    }

    // Verify CheckMacValue
    const { CheckMacValue, ...params } = data;
    const calculatedMac = generateCheckMacValue(params, HASH_KEY, HASH_IV);

    if (calculatedMac !== CheckMacValue) {
      console.error("ECPay CheckMacValue mismatch");
      return res.status(400).send("0|CheckMacValueMismatch");
    }

    if (data.RtnCode === '1') {
      const firestoredb = getDb();
      if (!firestoredb) return res.status(500).send("0|DBError");

      // Payment Success
      const userId = data.CustomField1;
      const durationMonths = parseInt(data.CustomField2);

      try {
        const userRef = firestoredb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentExpiry = userData?.subscriptionExpiry?.toDate() || new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          
          const newExpiry = new Date(baseDate);
          newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

          await userRef.update({
            subscriptionExpiry: Timestamp.fromDate(newExpiry),
            updatedAt: Timestamp.now()
          });
          
          console.log(`Successfully updated subscription for user ${userId} to ${newExpiry}`);

          // Send Email Notification
          const expiryString = newExpiry.toLocaleDateString('zh-TW', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          if (userData.email) {
            try {
              await sendNotificationEmail(userData.email, {
                expiryDate: expiryString,
                duration: durationMonths.toString()
              });
            } catch (emailError) {
              console.error("[Email] Automatic notification failed:", emailError);
            }
          }
        }
      } catch (error) {
        console.error("Error updating user subscription:", error);
        return res.status(500).send("0|UpdateError");
      }
    }

    res.send("1|OK");
  });

  // Proxy route - TERMINATED TO STOP COSTS
  app.get("/api/proxy", (req, res) => {
    res.status(410).json({ error: "Proxy service has been permanently disabled to control system costs." });
  });

  // Routing logic
  const isProd = process.env.K_SERVICE || process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, "dist");
  const distExists = fs.existsSync(distPath);

  if (isProd || distExists) {
    if (distExists) {
      console.log(`[Server] Serving static files from: ${distPath}`);
      app.use(express.static(distPath, {
        maxAge: '1d',
        etag: true,
        index: ['index.html']
      }));
    } else {
      console.warn("[Server] Production mode active but 'dist' directory is MISSING! Browsing will fail.");
    }

    app.get("*", (req, res) => {
      // API routes check
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API not found" });
      }

      // Static file check: If it has an extension and wasn't caught by express.static, it's missing.
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not Found');
      }

      // Fallback for SPA routing
      if (distExists) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.status(500).send("Application is not built yet. Please run 'npm run build' first.");
      }
    });
  } else {
    // Development mode with Vite
    try {
      console.log("[Server] Starting in DEVELOPMENT mode with Vite...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      // Handle POST to frontend routes in dev to fix ECPay redirect issues
      app.post("*", (req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        res.redirect(req.url);
      });
    } catch (e) {
      console.error("[Server] Vite initialization failed:", e);
    }
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Optimize for Cloud Run: shorter keep-alive means instances can shutdown sooner
  server.keepAliveTimeout = 5000; 
  server.headersTimeout = 6000;
}

startServer();
