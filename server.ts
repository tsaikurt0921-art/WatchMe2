import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: any;

const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    // Use modular getFirestore which supports databaseId as first argument
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    db = getFirestore(dbId);
    
    console.log(`[Firebase Admin] Initialized. Project: ${firebaseConfig.projectId}, Database: ${dbId}`);
  } catch (err) {
    console.error("[Firebase Admin] Initialization error:", err);
    db = getFirestore(); // Final fallback
  }
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

  // 4. URL Encode
  // JS encodeURIComponent is close to .NET's UrlEncode but needs specific tweaks
  let encoded = encodeURIComponent(rawString).toLowerCase();
  
  // 5. Replace specific characters to match ECPay's RFC 1738 requirement
  encoded = encoded
    .replace(/%20/g, '+')
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ECPay Payment Endpoint
  app.post("/api/payment/ecpay", async (req, res) => {
    const { planId, userId, userEmail } = req.body;
    
    // Use Stage credentials if ECPAY_URL is stage, unless user provided their own
    let ECPAY_URL = process.env.ECPAY_URL || "https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/V5";
    
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

    const isStage = ECPAY_URL.includes('stage');
    
    const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || (isStage ? '2000132' : '');
    const HASH_KEY = process.env.ECPAY_HASH_KEY || (isStage ? '5294y06JbCWpE5vM' : '');
    const HASH_IV = process.env.ECPAY_HASH_IV || (isStage ? 'v77hoKGq4kWxJtE5' : '');
    const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

    // Credential Mismatch Detection
    if (!isStage && MERCHANT_ID === '2000132') {
      console.error("[ECPay] Mismatch: Using Stage MerchantID on Production URL!");
      return res.status(400).json({ error: "環境設定錯誤：您正在使用正式環境網址，但 MerchantID 卻是測試用的 (2000132)。請在環境變數中填寫正確的正式金鑰。" });
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
      const now = new Date();
      const MerchantTradeDate = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const baseParams: any = {
        MerchantID: MERCHANT_ID,
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
      // Payment Success
      const userId = data.CustomField1;
      const durationMonths = parseInt(data.CustomField2);

      try {
        const userRef = db.collection('users').doc(userId);
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
        }
      } catch (error) {
        console.error("Error updating user subscription:", error);
        return res.status(500).send("0|UpdateError");
      }
    }

    res.send("1|OK");
  });

  // Proxy route to bypass X-Frame-Options and CSP
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");

    try {
      const response = await axios.get(targetUrl, {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        timeout: 10000,
      });

      // Set headers to allow embedding
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      let html = response.data;
      
      // Inject <base> tag to fix relative links (CSS, JS, Images)
      try {
        const urlObj = new URL(targetUrl);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;
        
        // Find <head> and inject <base>
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head><base href="${baseUrl}">`);
        } else if (html.includes("<HEAD>")) {
          html = html.replace("<HEAD>", `<HEAD><base href="${baseUrl}">`);
        } else {
          html = `<base href="${baseUrl}">${html}`;
        }
      } catch (e) {
        console.error("Base URL error:", e);
      }

      res.send(html);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).send(`Error fetching URL: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
