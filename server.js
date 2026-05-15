
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();

// في راندر نستخدم مجلد /tmp لأنه المجلد الوحيد المسموح فيه بالكتابة المؤقتة
const uploadDir = '/tmp/fokhm_uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
    dest: uploadDir,
    limits: { fileSize: 50 * 1024 * 1024 } // حد 50 ميجا للبوتات العادية
});

const BOT_TOKEN = '8845275171:AAGrjcCxv_2RDJ13HRKw54VSZXh3tXGHLto';
const CHAT_ID = '-1002459184921';

app.use(express.static('public'));
app.use(express.json());

// واجهة المستخدم (HTML المدمج)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FOKHM | Render Uploader</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                body { font-family: 'Tajawal', sans-serif; background: #020617; color: white; }
                .fokhm-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.3); }
            </style>
        </head>
        <body class="min-h-screen flex items-center justify-center p-6 text-right">
            <div class="max-w-lg w-full fokhm-card p-10 rounded-[2.5rem] shadow-2xl">
                <h1 class="text-4xl font-black text-blue-500 mb-2 text-center tracking-tight italic">FOKHM</h1>
                <p class="text-gray-400 text-center mb-8 text-sm">منصة راندر | الرفع في الخلفية</p>
                
                <div class="space-y-6">
                    <textarea id="caption" rows="3" placeholder="وصف الفيديو..." class="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all"></textarea>
                    
                    <div class="relative border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center bg-slate-900/50 hover:border-blue-500 transition-all">
                        <input type="file" id="vids" multiple accept="video/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        <div id="fileInfo" class="text-slate-400">
                            <p class="font-bold">اختر الفيديوهات (متعدد)</p>
                        </div>
                    </div>

                    <button onclick="uploadFiles()" id="btn" class="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold shadow-xl transition-all">بدء الرفع</button>

                    <div id="status" class="hidden">
                        <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                            <div id="bar" class="bg-blue-500 h-full w-0 transition-all duration-300"></div>
                        </div>
                        <p id="msg" class="text-center text-xs mt-3 text-blue-400 font-bold italic">جاري النقل لراندر...</p>
                    </div>
                </div>
            </div>

            <script>
                const vids = document.getElementById('vids');
                vids.onchange = () => {
                    if(vids.files.length) document.getElementById('fileInfo').innerText = "تم اختيار " + vids.files.length + " فيديو";
                };

                function uploadFiles() {
                    if(!vids.files.length) return alert('اختر ملف يا فخم!');
                    document.getElementById('btn').classList.add('hidden');
                    document.getElementById('status').classList.remove('hidden');

                    const fd = new FormData();
                    fd.append('caption', document.getElementById('caption').value);
                    for(let f of vids.files) fd.append('videos', f);

                    const x = new XMLHttpRequest();
                    x.open('POST', '/upload', true);
                    x.upload.onprogress = (e) => {
                        const p = Math.round((e.loaded/e.total)*100);
                        document.getElementById('bar').style.width = p + '%';
                        if(p >= 100) document.getElementById('msg').innerHTML = "✅ اكتمل النقل!<br>سكر المتصفح الحين، راندر يكمل الباقي.";
                    };
                    x.send(fd);
                }
            </script>
        </body>
        </html>
    `);
});

// استقبال ورفع
app.post('/upload', upload.array('videos'), async (req, res) => {
    res.json({ ok: true }); // رد سريع للمستخدم

    const { caption } = req.body;
    const files = req.files;

    for (const file of files) {
        try {
            const fd = new FormData();
            fd.append('chat_id', CHAT_ID);
            fd.append('caption', caption || '');
            fd.append('video', fs.createReadStream(file.path));
            fd.append('supports_streaming', 'true');

            console.log(\`Sending to Telegram: \${file.originalname}\`);
            
            await axios.post(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendVideo\`, fd, {
                headers: fd.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            fs.unlinkSync(file.path);
            console.log(\`Success: \${file.originalname}\`);
        } catch (e) {
            console.error(\`Fail: \${file.originalname} - \${e.message}\`);
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`FOKHM Server running on port \${PORT}\`));


