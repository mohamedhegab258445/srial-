/**
 * Smart Warranty — WhatsApp OTP Gateway
 * Self-hosted gateway using whatsapp-web.js
 * Exposes:
 *   GET  /status  → { ready, qr, phone }
 *   POST /send    → { to, message }  →  { success }
 *   POST /logout  → disconnects session
 */

const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ─── CORS (allow requests from frontend and backend) ─────────────────────────
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// ─── State ───────────────────────────────────────────────────────────────────
let qrDataUrl = null;   // base64 PNG of QR
let isReady = false;
let connectedPhone = null;

// ─── WhatsApp client ─────────────────────────────────────────────────────────
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./session" }),
    puppeteer: {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
        ],
    },
});

client.on("qr", async (qr) => {
    console.log("[QR] New QR code generated — scan with WhatsApp");
    isReady = false;
    qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 300 });
});

client.on("ready", () => {
    isReady = true;
    qrDataUrl = null;
    const info = client.info;
    connectedPhone = info ? `+${info.wid.user}` : "connected";
    console.log(`[READY] WhatsApp connected as ${connectedPhone}`);
});

client.on("authenticated", () => {
    console.log("[AUTH] Session authenticated");
});

client.on("auth_failure", (msg) => {
    console.error("[ERROR] Auth failure:", msg);
    isReady = false;
});

client.on("disconnected", (reason) => {
    console.log("[DISCONNECTED]", reason);
    isReady = false;
    qrDataUrl = null;
    connectedPhone = null;
    // Re-initialize to get a new QR
    setTimeout(() => client.initialize(), 3000);
});

console.log("[INIT] Starting WhatsApp client…");
client.initialize();

// ─── REST Endpoints ───────────────────────────────────────────────────────────

/** GET /status */
app.get("/status", (req, res) => {
    res.json({
        ready: isReady,
        qr: qrDataUrl,   // null when connected, data-URL when pending
        phone: connectedPhone,
    });
});

/** POST /send  { to: "201xxxxxxxxx", message: "..." } */
app.post("/send", async (req, res) => {
    const { to, message } = req.body;

    if (!isReady) {
        return res.status(503).json({ error: "WhatsApp not connected — scan the QR first" });
    }
    if (!to || !message) {
        return res.status(400).json({ error: "Missing 'to' or 'message'" });
    }

    try {
        // Normalize: strip non-digits, ensure international format
        const digits = to.replace(/\D/g, "");
        const chatId = `${digits}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`[SENT] OTP to ${chatId}`);
        res.json({ success: true });
    } catch (err) {
        console.error("[SEND ERROR]", err.message);
        res.status(500).json({ error: err.message });
    }
});

/** POST /logout */
app.post("/logout", async (req, res) => {
    try {
        await client.logout();
        isReady = false;
        qrDataUrl = null;
        connectedPhone = null;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[SERVER] WhatsApp Gateway listening on http://localhost:${PORT}`);
    console.log(`[SERVER] Status: http://localhost:${PORT}/status`);
});
