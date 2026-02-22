# 🛡️ Smart Warranty Tracker

نظام متكامل لإدارة ضمان المنتجات باستخدام الأرقام التسلسلية ورموز QR.

---

## 🗂️ هيكل المشروع

```
srial/
├── backend/          # FastAPI + SQLite
└── frontend/         # Next.js 14 + Tailwind CSS
```

---

## 🚀 تشغيل المشروع

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python seed.py           # تهيئة بيانات تجريبية (اختياري)
uvicorn main:app --reload --port 8000
```

API متاح على: **http://localhost:8000**  
توثيق تفاعلي: **http://localhost:8000/docs**

---

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

الموقع متاح على: **http://localhost:3000**

---

## 🔗 الصفحات

| الرابط | الوصف |
|---|---|
| `/` | صفحة البحث العامة |
| `/scan/SERIAL-NUMBER` | بطاقة الضمان (عامة) |
| `/portal` | بوابة العميل (OTP) |
| `/portal/ticket/new` | فتح تذكرة عطل |
| `/admin` | تسجيل دخول الإدارة |
| `/admin/dashboard` | لوحة التحكم |
| `/admin/products` | إدارة المنتجات |
| `/admin/serials` | إدارة السيريالات + QR |
| `/admin/tickets` | تذاكر الدعم الفني |
| `/admin/maintenance` | سجلات الصيانة |

---

## 🔑 بيانات الدخول الافتراضية

**Admin:** `admin` / `admin123`

---

## 🧪 اختبار سريع

```bash
# فحص سيريال تجريبي
curl http://localhost:8000/api/serials/SRL-DEMO0001

# تنزيل QR
curl http://localhost:8000/api/serials/SRL-DEMO0001/qr --output qr.png
```

---

## 🔐 الأمان

- **JWT** لمصادقة لوحة الإدارة
- **OTP بانتهاء 10 دقائق** لتسجيل دخول العملاء  
- **لا تعديل يدوي** على تواريخ الضمان (الحسابات server-side فقط)
- **Foreign Keys** مفعلة في SQLite
