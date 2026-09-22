# HelixNotes - Cloudflare Clean Fork

هذا هو نفس كود HelixNotes الأصلي + ملفين فقط للـ Cloudflare.

## شو فيه الـ Repo ؟
```
/
├── src/                    # كود HelixNotes الأصلي (Svelte frontend)
├── src-tauri/              # موجود بس مارح نستخدمه للـ web (لا تعمل tauri build)
├── src/worker.ts           # الجديد: API بديل للـ Rust backend
├── wrangler.toml           # إعدادات الـ Worker + Bindings
├── schema.sql              # جداول D1
├── package.json
└── vite.config.ts
```

## الفرق الوحيد عن الأصلي
الأصلي: frontend -> Tauri (Rust) -> قرص محلي
الفورك: frontend -> fetch('/api/...') -> Worker -> R2/D1/KV

يعني شلنا استدعاءات Tauri وحطينا fetch. كل مميزات المحرر، الـ wiki links، الـ graph، الـ tasks، الـ daily notes، نفسها 100% لأنها frontend.

## خطوات الربط (بدون ما تتغلب بـ compiling)

1. اعمل repo جديد على GitHub وارفعه:
   git clone https://gitlab.com/ArkHost/HelixNotes.git
   cp -r /path/to/clean-fork/* ./
   git add . && git push

2. على Cloudflare Dashboard -> Workers -> Create Worker -> Connect to Git

3. أنشئ الموارد مرة وحدة:
   wrangler r2 bucket create helixnotes-vault
   wrangler d1 create helixnotes-db  -> انسخ الـ database_id
   wrangler kv namespace create SETTINGS -> انسخ الـ id

4. حط الـ IDs في wrangler.toml مكان PUT_YOUR_...

5. نفذ الـ SQL:
   wrangler d1 execute helixnotes-db --file=./schema.sql

6. Build للـ Web فقط (مش Tauri):
   pnpm install
   pnpm build   # مش pnpm tauri build

7. Deploy:
   wrangler deploy

اذا شفت خطأ "binding not found" معناها نسيت تغير الـ ID في wrangler.toml.
اذا شفت "database_id missing" معناها لازم تعمل wrangler d1 create أول.

## Bindings شرح سريع
- VAULT (R2): ملفات الـ .md
- DB (D1): فهرس البحث
- SETTINGS (KV): ثيمك وإعداداتك الخاصة - بتفتح من أي جهاز نفس الإعدادات
