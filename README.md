# Test Platform - Jamoaviy Test Ishlash Tizimi

Testlarni yodlash va jamoaviy ishlash uchun mo'ljallangan web ilova.

## Texnologiyalar

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Font Awesome (CDN)
- **Backend:** Next.js API Routes
- **Real-time:** Polling-based updates (1 soniyada)
- **Ma'lumotlar:** In-memory storage (serverless-friendly)

## Loyiha strukturasi

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts       # Login API
│   │   ├── admin/users/route.ts      # Admin user management API
│   │   ├── user/profile/route.ts     # Profile update API
│   │   ├── sessions/route.ts         # Jamoaviy sessiyalar API
│   │   ├── leaderboard/route.ts      # Global leaderboard API
│   │   ├── random/route.ts           # Tasodifiy savollar API
│   │   └── variants/
│   │       ├── route.ts              # Variantlar ro'yxati
│   │       └── [id]/route.ts         # Variant ma'lumotlari
│   ├── dashboard/page.tsx            # Asosiy dashboard
│   ├── variant/[id]/page.tsx         # Test sahifasi
│   ├── random/page.tsx               # Tasodifiy test sahifasi
│   ├── leaderboard/page.tsx          # Global reyting sahifasi
│   ├── admin/page.tsx                # Admin panel
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Login sahifasi
├── data/
│   ├── users.ts                      # 22 ta foydalanuvchi + admin
│   ├── questions.ts                  # Savollar va variantlar
│   └── test.json                     # Test savollari JSON
├── lib/
│   ├── sessionStore.ts               # Sessiya va leaderboard boshqaruvi
│   └── utils.ts                      # Yordamchi funksiyalar
└── types/
    └── index.ts                      # TypeScript tiplar
```

## Xususiyatlar

### 1. Autentifikatsiya

- 22 ta oldindan yaratilgan talaba login/parol
- 1 ta admin foydalanuvchi
- Xavfsiz sessiya boshqaruvi
- LocalStorage orqali holat saqlash

### 2. Profil Sozlamalari

- Ismni o'zgartirish
- Parolni o'zgartirish

### 3. Individual Rejim

- Savollar bittadan chiqadi
- Javobdan keyin darhol natija ko'rsatiladi (yashil/qizil)
- Oxirida umumiy ball ko'rsatiladi

### 4. Jamoaviy Rejim

- Sessiya yaratish yoki mavjudiga qo'shilish
- 10 soniyadan 10 daqiqagacha kutish vaqti
- Real-time ishtirokchilar holati
- Barcha uchun bir vaqtda boshlanish
- Test oxirida reyting jadvali

### 5. Tasodifiy Test

- 5, 10, 15 yoki 20 ta savol tanlash
- Individual yoki guruh rejimi
- Barcha mavzulardan tasodifiy savollar

### 6. Global Reyting

- Barcha testlar bo'yicha umumiy reyting
- Top 5 talabalar uchun maxsus ranglar
- Top 3 talabalar uchun animatsiyalar
- Shaxsiy statistika

### 7. Admin Panel

- Foydalanuvchilarni ko'rish
- Yangi foydalanuvchi yaratish
- Foydalanuvchini tahrirlash
- Foydalanuvchini o'chirish

### 8. Aktiv Sessiyalar

- Dashboard da barcha aktiv guruh testlarini ko'rish
- Bir klik bilan sessiyaga qo'shilish

### 9. Dizayn

- Responsive (telefon va kompyuter)
- Innovatsion gradient dizayn
- Yirik, qulay tugmalar
- Animatsiyalar va transitions

## Login ma'lumotlari

### Admin

| Login | Parol             |
| ----- | ----------------- |
| admin | Admin@2024#Secure |

### Talabalar

| #   | Login    | Parol         |
| --- | -------- | ------------- |
| 1   | talaba01 | T@l@ba2024#01 |
| 2   | talaba02 | T@l@ba2024#02 |
| 3   | talaba03 | T@l@ba2024#03 |
| ... | ...      | ...           |
| 22  | talaba22 | T@l@ba2024#22 |

## O'rnatish va ishga tushirish

### Lokal muhitda

```bash
# Loyihaga kirish
cd testP

# Paketlarni o'rnatish
npm install

# Development serverini ishga tushirish
npm run dev

# Brauzerda ochish
# http://localhost:3000
```

### Production build

```bash
# Build qilish
npm run build

# Production serverini ishga tushirish
npm start
```

## Vercel ga Deploy Qilish

### 1-usul: GitHub orqali (Tavsiya etiladi)

1. Loyihani GitHub ga push qiling:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/test-platform.git
git push -u origin main
```

2. [Vercel.com](https://vercel.com) ga kiring
3. "New Project" tugmasini bosing
4. GitHub repositoriyangizni tanlang
5. "Deploy" tugmasini bosing

### 2-usul: Vercel CLI orqali

```bash
# Vercel CLI o'rnatish
npm i -g vercel

# Deploy qilish
vercel

# Production deploy
vercel --prod
```

### Environment Variables

Vercel dashboard da quyidagi sozlamalarni kiriting (agar kerak bo'lsa):

- `NODE_ENV`: production

### Muhim eslatmalar

1. **In-memory storage:** Hozirgi versiyada sessiyalar serverning xotirasida saqlanadi. Vercel serverless muhitda har bir instance alohida xotiraga ega. Production uchun Redis yoki database ishlatish tavsiya etiladi.

2. **Real-time yangilanish:** Polling orqali har 1 soniyada yangilanadi. WebSocket uchun alohida server kerak bo'ladi.

3. **Scaling:** Katta jamoalar uchun Vercel Pro yoki Enterprise tavsiya etiladi.

## Real-time ishlash mexanizmi

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client 1  │     │   Server    │     │   Client 2  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Create Session    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │   Session Data    │                   │
       │<──────────────────│                   │
       │                   │                   │
       │                   │   Join Session    │
       │                   │<──────────────────│
       │                   │                   │
       │   Poll (1s)       │   Poll (1s)       │
       │──────────────────>│<──────────────────│
       │                   │                   │
       │   Updated Data    │   Updated Data    │
       │<──────────────────│──────────────────>│
       │                   │                   │
       │   (Countdown ends - Test starts)      │
       │                   │                   │
       │  Answer Question  │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  Answer Question  │
       │                   │<──────────────────│
       │                   │                   │
       │   Progress Update │   Progress Update │
       │<──────────────────│──────────────────>│
       │                   │                   │
```

## Litsenziya

MIT License
