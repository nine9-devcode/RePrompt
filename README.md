# RePrompt — Stable Diffusion Prompt & Gallery Hub

[![CI](https://github.com/HairyNikka/RePrompt/actions/workflows/ci.yml/badge.svg)](https://github.com/HairyNikka/RePrompt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**RePrompt** เป็นเว็บแอปพลิเคชันแบบ self-hosted สำหรับเก็บ ค้นหา และจัดการ prompt จาก Stable Diffusion
พร้อมรูปภาพผลงาน จุดเด่นคือ **ดึงค่า prompt/seed/model จากไฟล์ภาพให้อัตโนมัติ** เพื่อให้กลับมาสร้างภาพเดิมซ้ำ (reproduce) ได้ง่าย

> A self-hosted web app for cataloguing Stable Diffusion prompts alongside the images they produced,
> with automatic metadata extraction from the image files themselves.

---

## ฟีเจอร์ (Features)

| | |
|---|---|
| **Auto metadata extraction** | ลากไฟล์ภาพจาก Stable Diffusion เข้ามา ระบบอ่าน PNG/EXIF แล้วเติม positive/negative prompt, steps, sampler, CFG scale, seed และ model ให้อัตโนมัติ |
| **Masonry gallery** | แกลเลอรีแบบ Pinterest รองรับภาพหลายอัตราส่วน พร้อม infinite scroll |
| **ค้นหาและกรอง** | ค้นหาตามชื่อ (debounce 300ms) กรองตามหมวดหมู่และโมเดล ทำงานฝั่งเซิร์ฟเวอร์ทั้งหมด |
| **ระบบเซนเซอร์ NSFW** | 3 รูปแบบ — blur / pixelate / block ปรับความเข้มได้ คลิกเพื่อดูทีละรูป มีสวิตช์เปิดปิดรวม และ **strict mode** ที่ซ่อนออกจากผลลัพธ์ตั้งแต่ฝั่งเซิร์ฟเวอร์ |
| **Auto-flag NSFW** | ติ๊กช่อง NSFW ให้อัตโนมัติเมื่อพบคำที่กำหนดไว้ใน prompt (แก้ไขรายการคำได้ในหน้าตั้งค่า) |
| **Inspector modal** | ดูภาพเต็มพร้อมซูมด้วยลูกกลิ้งเมาส์และลากเลื่อน ดูพารามิเตอร์ทั้งหมด และคัดลอก prompt ได้ในคลิกเดียว |
| **UI สองภาษา** | ไทยเป็นหลัก มีอังกฤษกำกับ ธีมมืดสไตล์ IDE |

---

## เทคโนโลยี (Tech stack)

**Frontend** — Angular 19 (standalone components, signals) · Tailwind CSS 3 · TypeScript strict · Angular SSR · `exifr`

**Backend** — ASP.NET Core 10 Minimal APIs · Entity Framework Core 10 · SQLite · เก็บไฟล์ภาพบนดิสก์ (`wwwroot/uploads/`)

---

## เริ่มใช้งาน (Getting started)

### สิ่งที่ต้องมีก่อน (Prerequisites)

- [.NET SDK 10](https://dotnet.microsoft.com/download) ขึ้นไป
- [Node.js 20](https://nodejs.org/) ขึ้นไป

### วิธีที่ง่ายที่สุด (Windows)

```bat
start-reprompt.bat
```

สคริปต์จะติดตั้ง dependency ที่ขาด เคลียร์พอร์ตที่ค้าง เปิดทั้ง backend และ frontend
แล้วเปิดเบราว์เซอร์ให้เมื่อพร้อม

### รันแยกส่วน (Manual)

```bash
# Backend -> http://localhost:5144
cd backend/RePrompt.Api
dotnet run
```

```bash
# Frontend -> http://localhost:4200
cd frontend
npm install
npm start
```

ฐานข้อมูลจะถูกสร้างและ migrate ให้อัตโนมัติตอนเปิดเซิร์ฟเวอร์ครั้งแรก — ไม่ต้องรัน `dotnet ef database update` เอง

---

## คำสั่งที่ใช้บ่อย (Common commands)

```bash
dotnet test                 # backend tests
```

```bash
npm test --prefix frontend  # frontend tests
```

```bash
npm run lint --prefix frontend
```

```bash
npm run format --prefix frontend
```

---

## โครงสร้างโปรเจกต์ (Project structure)

```
backend/
  RePrompt.Api/
    Endpoints/      minimal API endpoints (prompts, uploads)
    Services/       ImageStorageService — จัดการไฟล์ภาพทั้งหมดที่แตะดิสก์
    Dtos/           request models แยกจาก entity เพื่อกัน mass assignment
    Validation/     ตัวช่วยรัน DataAnnotations (minimal API ไม่รันให้เอง)
    Data/ Models/   DbContext และ entity
    Migrations/     EF Core migrations
  RePrompt.Api.Tests/

frontend/src/app/
  core/services/    PromptService (HTTP), SettingsService (ค่าตั้งค่า NSFW), ToastService
  core/models/      TypeScript interfaces
  features/         prompt-list (แกลเลอรี + modal), prompt-form, settings
  shared/components/ prompt-card, confirm-dialog, filter-bar, nsfw-overlay, pixelate-filter, toast
frontend/src/environments/   API base url แยก dev/prod
```

---

## API

| Method | Route | คำอธิบาย |
|---|---|---|
| `GET` | `/api/prompts` | รายการ prompt — `search`, `category`, `model`, `includeNsfw`, `limit` (1–100), `offset` |
| `GET` | `/api/prompts/{id}` | prompt เดียว |
| `POST` | `/api/prompts` | สร้างใหม่ |
| `PUT` | `/api/prompts/{id}` | แก้ไข |
| `DELETE` | `/api/prompts/{id}` | ลบ พร้อมลบไฟล์ภาพบนดิสก์ |
| `DELETE` | `/api/images/{id}` | ลบภาพเดียว |
| `GET` | `/api/suggestions` | ค่าที่เคยใช้ของ model / sampler / category |
| `POST` | `/api/upload` | อัปโหลดภาพ คืน url สำหรับใส่ใน `images[].imageUrl` |
| `DELETE` | `/api/uploads/{fileName}` | ลบไฟล์ที่อัปโหลดค้างไว้แต่ยังไม่ได้ผูกกับ prompt |
| `GET` | `/api/export` | ดาวน์โหลดไฟล์สำรองทั้งหมดเป็น .zip (`prompts.json` + `images/`) |

ดูตัวอย่างคำขอทั้งหมดได้ใน [`RePrompt.Api.http`](backend/RePrompt.Api/RePrompt.Api.http)

---

## สำรองข้อมูล (Backup)

ข้อมูลทั้งหมดอยู่ใน `backend/RePrompt.Api/reprompt.db` และโฟลเดอร์ `wwwroot/uploads/` ซึ่งทั้งคู่ถูก gitignore ไว้
และเพราะ SQLite ใช้โหมด WAL การคัดลอกเฉพาะไฟล์ `reprompt.db` อาจทำให้ข้อมูลล่าสุดหายได้

ให้ใช้ปุ่ม **ดาวน์โหลดไฟล์สำรอง** ในหน้าตั้งค่า (หรือเรียก `GET /api/export`) จะได้ไฟล์ .zip ที่มี:

```
prompts.json     ข้อมูล prompt ทั้งหมด พร้อม schemaVersion
images/          ไฟล์ภาพทุกไฟล์ที่ถูกอ้างถึง
```

ตอนนี้รองรับเฉพาะการ export — การกู้คืนต้องทำเองจากไฟล์ทั้งสองส่วน

---

## หมายเหตุเรื่องความปลอดภัย (Security notes)

โปรเจกต์นี้ออกแบบมาให้รันบนเครื่องตัวเอง (localhost) และ **ไม่มีระบบ authentication**
ถ้าจะเอาไป deploy ให้คนอื่นเข้าถึง ต้องเพิ่ม auth ก่อนเสมอ เพราะทุก endpoint เปิดหมด

สิ่งที่ทำไว้แล้วถึงจะรันแค่บนเครื่องตัวเอง (เพราะเว็บอื่นที่เปิดอยู่ในเบราว์เซอร์เดียวกันยิง request มาที่ localhost ได้):

- ไฟล์อัปโหลดตรวจจาก **magic bytes** ไม่ใช่ `Content-Type` ที่ client ส่งมา และตั้งชื่อไฟล์ใหม่ฝั่งเซิร์ฟเวอร์ทั้งหมด
- static files เสิร์ฟเฉพาะโฟลเดอร์ `uploads/` เฉพาะนามสกุลภาพ พร้อม `nosniff` และ CSP sandbox
- ทุก path ที่ไปแตะดิสก์ผ่าน `ImageStorageService` ซึ่งปฏิเสธทุกอย่างที่ไม่ใช่ชื่อไฟล์ธรรมดาใน `uploads/` แล้วเช็ค canonical path ซ้ำอีกชั้น
- ใช้ DTO แยกจาก entity เพื่อไม่ให้ client กำหนด `Id` หรือแนบ image graph มาเองได้
- `limit`/`offset` มีขอบเขต และ request body มีเพดานขนาด

---

## License

[MIT](LICENSE)
