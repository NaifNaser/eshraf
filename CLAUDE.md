# إشراف المدرسة — تعليماتُ المشروع لـClaude Code

- **الردُّ بالعربية دائماً.** المنصّةُ عربيةٌ RTL بخطِّ Sakkal Saad من `fonts/`.
- تطبيقُ صفحةٍ واحدة بلا أدواتِ بناء: `index.html` + `css/eshraf.css` + `js/{config,fb,charts,app}.js`. لا تُضفْ إطارَ عملٍ ولا حزمَ npm.
- **`js/config.js` هو الملفُّ الوحيدُ الخاصُّ بالجهاز/المشرف** (مشروعُ فايربيس، المفتاح، `ADMINS`، اسمُ المدرسة). لا تضعْ هذه القيمَ في ملفٍّ آخر.
- البياناتُ في Firestore عبر REST (`js/fb.js` — `FB.DB.get/set/patch/del/list/query`) بمجموعاتٍ ببادئة `es_`: `es_meta/settings`، `es_meta/access`، `es_classes/{id}`، `es_days/{YYYY-MM-DD}` (وثيقةٌ لليومِ للمدرسةِ كلِّها بحقولِ `ev[] sids[] clss[]`)، `es_log/log_YYYY-MM`. راجع README.md §٢ قبل أيِّ تغييرٍ في البنية، وحافظْ على التوافقِ الخلفيِّ مع الوثائقِ المحفوظة.
- أنواعُ التسجيل ثابتةٌ في `TYPES` داخل app.js: `late absent sick sleep viol pledge note`؛ أنواعُ المخالفة `VIOL_KEYS`: `dismiss banned uniform behavior` (أسماؤها المعروضةُ في `settings.violCats`).
- كلُّ كتابةٍ تمرُّ بـ`write()` (طابورٌ بلا إنترنت) وتُسجَّلُ بـ`log()`. لا تكتبْ إلى `DB` مباشرةً من الواجهات.
- الأمانُ في `firestore.rules` بالبريد؛ عند تغييرِ المشرف عدّلْ `ADMINS` في config.js **و** `esAdmin()` في القواعد، وذكّرِ المستخدمَ بنشرِ القواعدِ يدوياً من Firebase Console (لا يمكنُ نشرُها من هنا).
- الاختبار: `python3 -m http.server 8790` من هذا المجلّد ثم `http://localhost:8790/index.html?demo=1` (بياناتٌ وهميّةٌ تُزرَعُ تلقائياً في localStorage). تحقّقْ من كونسول المتصفّحِ بلا أخطاء وجرّبِ الجوالَ (٣٧٥px).
- بعد أيِّ تعديلٍ في الملفّات: ارفعْ `VERSION` في config.js و`?v=N` في index.html و`V` + `SHELL` في sw.js.
- مشروعُ فايربيس: `eshraf-2d848` بحسابِ نايف `naifnaser95@gmail.com` (مستقلٌّ عن مشاريعِ حيدر). أيُّ بريدٍ يُضافُ إلى `ADMINS` يجبُ أن يُضافَ إلى `esAdmin()` في القواعدِ ويُنشَر.
- النشر: `git push origin main` إلى `NaifNaser/eshraf` ← GitHub Pages ← `https://naifnaser.github.io/eshraf/`.
- المهارةُ التفصيلية: `.claude/skills/eshraf-platform/SKILL.md`.
