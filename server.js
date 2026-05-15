
const express = require('express');
const multer = require('multer');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// إعدادات المتغيرات (يفضل وضعها في Environment Variables على Render)
const BOT_TOKEN = '8845275171:AAGrjcCxv_2RDJ13HRKw54VSZXh3tXGHLto';
const CHAT_ID = '-1002459184921';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);
const app = express();

// إعداد تخزين الملفات مؤقتاً
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2000 * 1024 * 1024 } // حد 2 جيجابايت (يعتمد على قدرة السيرفر)
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// واجهة المستخدم (HTML)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة رفع الفيديوهات الفخمة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: #0f172a; color: white; font-family: sans-serif; }
            .card { background: #1e293b; border-radius: 1rem; padding: 2rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
        <div class="card w-full max-w-lg">
            <h1 class="text-2xl font-bold mb-6 text-center text-blue-400">مشاركة الفيديوهات عبر البوت</h1>
            <form action="/upload" method="POST" enctype="multipart/form-data" id="uploadForm">
                <div class="mb-4">
                    <label class="block mb-2 text-sm">العنوان والوصف:</label>
                    <textarea name="caption" rows="3" class="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="اكتب وصف الفيديو هنا..."></textarea>
                </div>
                <div class="mb-6">
                    <label class="block mb-2 text-sm">اختر الفيديوهات (يمكنك اختيار أكثر من واحد):</label>
                    <input type="file" name="videos" multiple accept="video/*" class="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer">
                </div>
                <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-300">
                    بدء الرفع والنشر الفوري
                </button>
            </form>
            <div id="status" class="mt-4 text-center hidden">
                <div class="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status"></div>
                <p class="mt-2 text-sm text-slate-300">جاري الرفع إلى السيرفر... لا تغلق الصفحة حتى اكتمال شريط الرفع</p>
            </div>
        </div>

        <script>
            const form = document.getElementById('uploadForm');
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('status');

            form.onsubmit = () => {
                btn.disabled = true;
                btn.classList.add('opacity-50');
                status.classList.remove('hidden');
            };
        </script>
    </body>
    </html>
    `);
});

// معالجة الرفع والإرسال
app.post('/upload', upload.array('videos'), async (req, res) => {
    const files = req.files;
    const caption = req.body.caption || "";

    if (!files || files.length === 0) {
        return res.send("لم يتم اختيار ملفات!");
    }

    // الرد فوراً للمتصفح بأن الرفع تم بنجاح وسيبدأ البوت العمل في الخلفية
    res.send(`
        <div style="background:#0f172a; color:white; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
            <h2 style="color:#4ade80;">تم استلام الملفات بنجاح!</h2>
            <p>البوت يقوم الآن بإرسال ${files.length} فيديوهات إلى القناة في الخلفية.</p>
            <p>يمكنك إغلاق هذه الصفحة الآن، البوت سيكمل عمله على Render.</p>
            <a href="/" style="color:#3b82f6; text-decoration:none; margin-top:20px;">العودة لرفع المزيد</a>
        </div>
    `);

    // إرسال الملفات في الخلفية (Background Task)
    for (const file of files) {
        try {
            await bot.telegram.sendVideo(CHAT_ID, { source: file.path }, {
                caption: caption,
                supports_streaming: true // للسماح بمشاهدة الفيديو أثناء التحميل في تليجرام
            });
            console.log(`Sent: ${file.originalname}`);
        } catch (err) {
            console.error(`Error sending ${file.originalname}:`, err);
        } finally {
            // حذف الملف من السيرفر بعد الإرسال لتوفير المساحة
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    bot.launch(); // تشغيل البوت
});

// معالجة إغلاق البوت بشكل نظيف
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

