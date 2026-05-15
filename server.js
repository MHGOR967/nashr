const express = require('express');
const multer = require('multer');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// إعدادات البوت والقروب
const BOT_TOKEN = '8845275171:AAGrjcCxv_2RDJ13HRKw54VSZXh3tXGHLto';
const CHAT_ID = '-1002459184921';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// إنشاء مجلد uploads إذا لم يكن موجوداً لمنع الخطأ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد تخزين الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2000 * 1024 * 1024 } // حد 2 جيجابايت
});

app.use(express.urlencoded({ extended: true }));

// الصفحة الرئيسية (UI)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fokhm Uploader</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white flex items-center justify-center min-h-screen p-4 font-sans">
        <div class="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
            <h1 class="text-3xl font-black mb-2 text-center text-blue-400">فخم Fokhm</h1>
            <p class="text-slate-400 text-center mb-8 text-sm">نظام رفع الفيديوهات المباشر للتليجرام</p>
            
            <form action="/upload" method="POST" enctype="multipart/form-data" id="fokhmForm">
                <div class="mb-5">
                    <label class="block text-sm font-medium mb-2 text-slate-300">وصف الفيديو:</label>
                    <textarea name="caption" rows="3" class="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="اكتب النص هنا..."></textarea>
                </div>
                
                <div class="mb-8">
                    <label class="block text-sm font-medium mb-2 text-slate-300">اختر الفيديوهات:</label>
                    <input type="file" name="videos" multiple accept="video/*" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer">
                </div>
                
                <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg shadow-blue-900/20">
                    ارفع الآن
                </button>
            </form>

            <div id="loading" class="hidden mt-6 text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p class="mt-3 text-blue-400 font-medium">جاري الرفع للسيرفر... خلك بالصفحة</p>
            </div>
        </div>

        <script>
            const form = document.getElementById('fokhmForm');
            const btn = document.getElementById('submitBtn');
            const loader = document.getElementById('loading');

            form.onsubmit = () => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                loader.classList.remove('hidden');
            };
        </script>
    </body>
    </html>
    `);
});

// معالجة الرفع
app.post('/upload', upload.array('videos'), async (req, res) => {
    const files = req.files;
    const caption = req.body.caption || "";

    if (!files || files.length === 0) return res.status(400).send("محد اخترت شي!");

    // رد سريع للمستخدم عشان يقدر يطلع
    res.send(`
        <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
            <div>
                <h1 style="color:#4ade80;">كفو يا فخم! تم استلام الملفات</h1>
                <p>البوت شغال الحين يرسلهم للقروب بالخلفية.</p>
                <p>تقدر تطلع الحين، الإرسال ما راح يوقف.</p>
                <br>
                <a href="/" style="background:#2563eb; color:white; padding:10px 20px; border-radius:8px; text-decoration:none;">ارفع غيره</a>
            </div>
        </body>
    `);

    // إرسال الفيديوهات في الخلفية
    for (const file of files) {
        try {
            await bot.telegram.sendVideo(CHAT_ID, { source: file.path }, {
                caption: caption,
                supports_streaming: true
            });
            console.log(`Successfully sent: ${file.filename}`);
        } catch (err) {
            console.error(`Error sending ${file.filename}:`, err.message);
        } finally {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
    }
});

// تشغيل
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    bot.launch().then(() => console.log('Bot is active!'));
});
