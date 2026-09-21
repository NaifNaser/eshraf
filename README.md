# إشراف المدرسة — منصّةُ متابعةِ الطلاب

منصّةُ صفحةٍ واحدة (HTML/CSS/JS بلا بناء) للمشرفِ التربوي: تجمعُ كلَّ ما يخصُّ الطالبَ في ملفٍّ واحد —
**التأخيرُ الصباحي · الغياب (بعذر/بلا عذر) · المرضيّات · النومُ في الحصّة · المخالفات (فصلٌ من الحصّة / ممنوعات / الزيّ / السلوك) · التعهّدات · الملاحظات** — مع الفصلِ والصفِّ ورقمِ الجلوسِ ووليِّ الأمر، وتقاريرَ للفصلِ والمدرسة، وورقةِ تعهّدٍ وخطابِ وليِّ أمرٍ جاهزَين للطباعة.

- **الرابطُ بعد النشر**: `https://naifnaser.github.io/eshraf/` (GitHub Pages من مستودع `NaifNaser/eshraf`)
- **البيانات**: Firebase — مشروعٌ مستقلٌّ باسم `eshraf-2d848` مملوكٌ لحسابِ نايف (Auth بالبريدِ وكلمةِ المرور + Firestore عبر REST بلا SDK، بالطريقةِ نفسِها المستعملةِ في منصّة «مدرستي»).
- **حسابُ المشرف**: `naifnaser95@gmail.com` (يُغيَّرُ من `js/config.js` و`firestore.rules`).
- **يعملُ بلا إنترنت** (طابورُ كتابةٍ يُرسَلُ عند عودةِ الشبكة) ويُثبَّتُ كتطبيقٍ على الجوال (PWA).
- **وضعٌ تجريبيّ**: افتحْ `index.html?demo=1` لترى المنصّةَ ببياناتٍ وهميّةٍ محفوظةٍ في المتصفّحِ فقط.

---

## ١. بنيةُ الملفّات

```
eshraf/
├── index.html              الهيكلُ والتبويبات
├── css/eshraf.css          الأنماط (صقال سعد، كحلي × ذهبي)
├── js/config.js            ★ الإعداداتُ الوحيدةُ التي تُعدَّلُ عند النقل (المشروع، المفتاح، البريد، المدرسة)
├── js/fb.js                طبقةُ فايربيس (Auth + Firestore REST) + وضعٌ تجريبيّ
├── js/charts.js            رسومُ SVG (أعمدةٌ أسبوعية + تقويم)
├── js/app.js               كلُّ الواجهاتِ والمنطق
├── fonts/                  Sakkal Saad + Poster (woff2)
├── img/logo.svg            الشعار (ونسخةٌ كريميّةٌ للترويسة)
├── icons/                  أيقوناتُ PWA
├── manifest.webmanifest · sw.js
├── firestore.rules         قواعدُ الأمان — تُنشَرُ يدوياً في Firebase Console
├── CLAUDE.md               تعليماتُ Claude Code لهذا المشروع
└── .claude/skills/eshraf-platform/SKILL.md   مهارةُ التطوير (تُحمَّلُ تلقائياً مع المجلّد)
```

## ٢. بنيةُ البياناتِ في Firestore (بادئة `es_`)

| المجموعة | الوثيقة | المحتوى |
|---|---|---|
| `es_meta` | `settings` | المدرسة، المشرف، العام، الفصولُ الدراسية، الصفوف، نهايةُ الطابور، حدودُ التنبيه، الأوزان، التصنيفات، نصُّ التعهّد، viewers |
| `es_meta` | `access` | `{viewers:[…]}` تُستعملُ في القواعدِ للمشرفِ القارئ |
| `es_classes` | `{id}` | `{name, grade, order, archived?, students:[{id,name,no?,civil?,guardian?,gphone?,note?}]}` |
| `es_days` | `{YYYY-MM-DD}` | **وثيقةٌ واحدةٌ لليومِ للمدرسةِ كلِّها**: `{date, ev:[…], sids:[…], clss:[…], n}` |
| `es_log` | `log_YYYY-MM` | سجلُّ النشاط `{items:[{ts,act,d,by}]}` |

**التسجيلُ الواحد `ev[]`**: `{id, sid, cls, type, ts, note?, …}` حيث `type` ∈ `late` (time, min) · `absent` (sub: unexcused/excused, reason) · `sick` (from, to, days, src) · `sleep` (period, teacher) · `viol` (sub: dismiss/banned/uniform/behavior, item, period, teacher, action) · `pledge` (kind, text, guardian) · `note`.

لماذا وثيقةٌ لليوم؟ عرضُ اليومِ = قراءةٌ واحدة، وكلُّ التقاريرِ = قائمةُ الأيّام (≈١٨٠ وثيقةً في العام) بذاكرةِ ١٠ دقائق ونسخةٍ محلّية، بلا فهارسَ مركّبة.

## ٣. التشغيلُ أوّلَ مرّة (على أيِّ جهاز)

1. **فايربيس**: المشروعُ الحاليُّ `eshraf-2d848` جاهزٌ (Email/Password مفعَّل والقواعدُ منشورة). إن أردتَ مشروعاً آخر:
   - Authentication ← Sign-in method ← فعّلْ **Email/Password**.
   - Firestore ← Rules ← الصقْ محتوى `firestore.rules` (أو كتلةَ إشراف فقط إن كان المشروعُ مشتركاً) ← **Publish**.
   - إن أردتَ مشروعاً مستقلاً: أنشئْه، خذْ `projectId` و`apiKey` من Project settings ← Web app، وضعْهما في `js/config.js`.
2. **الحساب**: افتحِ المنصّةَ ← «أنشئْ حسابَ المشرف» بالبريدِ المذكورِ في `ADMINS` وكلمةِ مرور (٦ أحرفٍ فأكثر). لا يُسمَحُ بإنشاءِ حسابٍ لبريدٍ آخر.
3. **الطلاب**: «الطلابُ والفصول» ← «استيرادُ قائمة» والصقْ من إكسل عمودَين (الفصل، الاسم) وثالثاً اختياريّاً (رقمُ الجلوس)؛ أو أنشئْ فصلاً والصقْ الأسماء.
4. **الإعدادات**: اسمُ المدرسة والمشرف، تواريخُ الفصلَين الدراسيَّين، نهايةُ الطابورِ الصباحي، حدودُ التنبيه، الأوزان، التصنيفات.

## ٤. النشرُ على GitHub Pages

```bash
cd eshraf
git remote -v            # يجبُ أن يكونَ origin = https://github.com/NaifNaser/eshraf.git
git push -u origin main  # يطلبُ اسمَ المستخدمِ ورمزَ وصولٍ (Personal Access Token) لحساب NaifNaser
```
ثم في GitHub: **Settings ← Pages ← Source: Deploy from a branch ← main / (root) ← Save**. بعد دقيقة: `https://naifnaser.github.io/eshraf/`.

## ٥. النقلُ إلى كمبيوترٍ آخر

المجلّدُ كلُّه محمول: انسخْه (أو `git clone https://github.com/NaifNaser/eshraf.git`) وافتحْه في Claude Code — `CLAUDE.md` والمهارةُ في `.claude/skills/` تُحمَّلانِ تلقائياً فيعرفُ Claude البنيةَ والقواعدَ فوراً. لا حاجةَ إلى Node أو أيِّ تثبيت؛ للمعاينةِ المحلّية:

```bash
python3 -m http.server 8790
```
ثم `http://localhost:8790/index.html?demo=1` للتجربة، أو بلا `?demo=1` للبياناتِ الحقيقية.

**عند تعديلِ أيِّ ملفّ**: ارفعْ `VERSION` في `js/config.js` و`?v=N` في `index.html` و`V`/`SHELL` في `sw.js` ليُحدَّثَ التطبيقُ المثبَّتُ على الأجهزة.

## ٦. الصفحاتُ (مساراتُ الهاش)

`#/` اليوم (بلاطات، تنبيهات، سجلُّ اليوم، `#/YYYY-MM-DD` ليومٍ آخر) · `#/late` الطابورُ الصباحي (اسمٌ + إدخال = تأخيرٌ بوقتِه) · `#/absent/<date>/<cls>` حصرُ الغياب بالنقر · `#/students` الفصولُ والبحث · `#/class/<id>` جدولُ الفصلِ بالعدّاداتِ والمؤشّر · `#/student/<cls>/<sid>[/<type>]` ملفُّ الطالب (رسم، تقويم، خطٌّ زمني) · `#/reports` المدرسةُ كلُّها · `#/log` كلُّ التسجيلات بمرشّحات · `#/pledge/<cls>/<sid>/<ev>` ورقةُ تعهّد · `#/letter/<cls>/<sid>` خطابُ وليِّ الأمر (نسخ/واتساب/طباعة) · `#/settings` · `#/activity` سجلُّ النشاط.
