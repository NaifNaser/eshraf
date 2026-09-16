---
name: eshraf-platform
description: استخدم هذه المهارة عند أيِّ عملٍ على منصّة «إشراف المدرسة» (eshraf) — إضافةُ ميزة، إصلاحُ خلل، تغييرُ المشرفِ أو المدرسة، نقلُ المنصّة إلى جهازٍ أو مشروعِ فايربيس آخر، نشرُها على GitHub Pages، أو شرحُ بنيتِها. عباراتُ الإطلاق: «إشراف المدرسة»، «eshraf»، «منصة الإشراف»، «سجّل مخالفة»، «الطابور الصباحي»، «تعهد الطالب»، «انقل المنصة»، «غيّر إيميل المشرف»، «انشر المنصة».
---

# منصّةُ إشراف المدرسة — دليلُ التطوير

## ما هي
تطبيقُ صفحةٍ واحدة (بلا بناء) للمشرفِ التربوي يجمعُ سجلَّ كلِّ طالب: تأخيرٌ صباحي، غياب (بعذر/بلا عذر)، مرضيّات، نومٌ في الحصّة، مخالفات (فصلٌ من الحصّة / ممنوعات / الزيّ / السلوك)، تعهّدات، ملاحظات — مع تقاريرِ الفصلِ والمدرسة وطباعةِ التعهّدِ وخطابِ وليِّ الأمر.
البيانات: Firebase (Auth بالبريد + Firestore REST بلا SDK) بالنمطِ نفسِه المستعملِ في منصّة «مدرستي».

## الملفّاتُ وأدوارُها
| الملف | الدور |
|---|---|
| `js/config.js` | **الوحيدُ الذي يُعدَّلُ عند النقل**: `PROJECT_ID, API_KEY, ADMINS[], SCHOOL, SUPERVISOR, PREFIX, VERSION` |
| `js/fb.js` | `FB.Auth` (signIn/signUp/resetPassword/restore/signOut) و`FB.DB` (get/set/patch/del/list/query) و`FB.isAdmin` و`FB.col(n)` ← `es_n`؛ `?demo=1` يبدّلُ DB إلى localStorage |
| `js/app.js` | كلُّ شيءٍ آخر: `TYPES`، الإعداداتُ الافتراضية `defaultSettings()`، الطابورُ `write()/flush()`، الأيّامُ `loadAll/loadDay/saveDay/addEvent/updateEvent/removeEvent`، الاستعلامُ `evsIn(from,to,f)` و`countBy()` و`score()`، الواجهاتُ في `ROUTES` |
| `js/charts.js` | `Charts.stackedBars(host,buckets,series)` و`Charts.calendar(host,from,to,dayMap,colors)` |
| `css/eshraf.css` | متغيّراتُ الألوان `--navy --gold --c-<type>`، مكوّناتُ `.tile .ev .stu .pick .sheet .doc`، الطباعةُ `@media print`، الجوالُ `@media(max-width:720px)` |
| `firestore.rules` | تُنشَرُ يدوياً من Firebase Console؛ البريدُ فيها يطابقُ `ADMINS` |

## بنيةُ البيانات (لا تكسرْها)
- `es_meta/settings` — انظر `defaultSettings()`؛ أيُّ حقلٍ جديدٍ يُضافُ هناك وفي `normSettings()`.
- `es_classes/{id}` — `{name, grade, order, archived?, students:[{id,name,no?,civil?,guardian?,gphone?,note?}]}`.
- `es_days/{YYYY-MM-DD}` — وثيقةٌ لليومِ للمدرسةِ كلِّها: `{date, ev:[], sids:[], clss:[], n}`. `saveDay()` تعيدُ حسابَ `sids/clss/n` دائماً.
- التسجيلُ `ev`: `{id,sid,cls,type,ts,note?}` + حقولُ النوع (late: time,min · absent: sub,reason · sick: from,to,days,src · sleep: period,teacher · viol: sub,item,period,teacher,action · pledge: kind,text,guardian).
- إضافةُ نوعٍ جديد = عنصرٌ في `TYPES` + لونٌ `--c-<key>` في CSS (+ قواعدُ `.tile/.ev/.b/.chips` بالنوع) + حقولُه في `recordSheet()` و`subLabel()` + وزنُه في `defaultSettings().weights`.

## مهامٌّ متكرّرة
- **تغييرُ المشرف/البريد**: `ADMINS` في config.js + `esAdmin()` في firestore.rules ← اطلبْ من المستخدمِ نشرَ القواعد (Firebase Console ← Firestore ← Rules ← Publish) ثم إنشاءَ الحسابِ من صفحةِ الدخول.
- **مشروعُ فايربيس جديد**: فعّلْ Email/Password، انسخْ projectId/apiKey إلى config.js، انشرْ firestore.rules كاملاً.
- **النشر**: `git add -A && git commit && git push origin main`؛ Pages من فرع main جذرِ المستودع. ارفعْ `VERSION`/`?v=`/`sw.js` مع كلِّ تعديل.
- **الاختبار**: `python3 -m http.server 8790` ← `index.html?demo=1`؛ افحصْ الكونسول، وجرّبِ الطابورَ (اكتبِ اسماً + Enter)، وحصرَ الغياب (نقرٌ يبدّلُ الحالة)، وورقةَ التسجيل (`ES.recordSheet({type:'viol'})` من الكونسول)، والطباعةَ (`window.print()`)، والجوالَ ٣٧٥px.
- **إضافةُ صفحة**: دالّةٌ `async function xView(p)` تكتبُ في `view.innerHTML`، وتُسجَّلُ في `ROUTES` (و`TABMAP` إن كانت فرعيّةً من تبويب).

## قواعدُ الأسلوب
- عربيةٌ مشكولةٌ خفيفاً في النصوصِ الظاهرة، أرقامٌ عربيةٌ عبر `ar()`، كلُّ نصٍّ من المستخدمِ يمرُّ بـ`esc()`.
- لا مكتباتٍ خارجية ولا CDN (المنصّةُ تعملُ بلا إنترنت)، عدا jsPDF/html2canvas إن طُلب تصديرُ PDF لاحقاً.
- لا تكتبْ إلى `DB` مباشرةً من الواجهات؛ استعملْ `write()` (يمرُّ بالطابورِ ويحترمُ القراءةَ فقط) و`log()`.
