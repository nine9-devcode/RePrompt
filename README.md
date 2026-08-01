# RePrompt

[![CI](https://github.com/nine9-devcode/RePrompt/actions/workflows/ci.yml/badge.svg)](https://github.com/nine9-devcode/RePrompt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**คลังเก็บรูป AI พร้อม "สูตร" ที่ใช้สร้างมัน — ค้นหาย้อนกลับมาใช้ซ้ำได้**

> A personal web app for cataloguing AI-generated images together with the exact
> settings that produced them, so any image can be recreated or tweaked later.

---

## โปรเจกต์นี้คืออะไร (What is this?)

เวลาสร้างรูปด้วย AI (Stable Diffusion) สิ่งที่ต้องใส่เข้าไปไม่ใช่แค่คำสั่งสั้น ๆ แต่เป็น **"สูตร"** ที่ประกอบด้วย
คำอธิบายภาพยาว ๆ (prompt), สิ่งที่ไม่อยากให้มี (negative prompt), โมเดลที่ใช้, และค่าตัวเลขอีกหลายตัว
ถ้าอยากได้ภาพเดิมอีกครั้ง หรืออยากแก้แค่นิดเดียว — ต้องใช้สูตรเดิมทั้งชุด

ปัญหาคือ **สูตรกับรูปมักจะหลุดจากกัน** รูปกองอยู่ในโฟลเดอร์ ส่วนสูตรอยู่ในไฟล์ note บ้าง แชทบ้าง
พอผ่านไปสองเดือนก็จำไม่ได้แล้วว่ารูปนี้ใช้อะไรสร้าง

**RePrompt แก้ปัญหานี้ด้วยการเก็บรูปกับสูตรไว้ด้วยกัน** และที่สำคัญคือ
**ไม่ต้องพิมพ์สูตรเองเลย** — แค่ลากไฟล์รูปเข้ามา ระบบจะอ่านข้อมูลที่ฝังอยู่ในไฟล์ภาพ
แล้วเติมช่องต่าง ๆ ให้อัตโนมัติ จากนั้นค้นหา กรองด้วยแท็ก และกดคัดลอกสูตรไปใช้ต่อได้ในคลิกเดียว

<!-- TODO: ใส่ screenshot ของหน้าแกลเลอรีและหน้าฟอร์มตรงนี้ -->

**ทำเพื่ออะไร:** เป็นโปรเจกต์ส่วนตัวที่ใช้งานจริง และใช้ฝึกทำ full-stack ด้วย .NET + Angular
รันบนเครื่องตัวเอง ข้อมูลทั้งหมดอยู่ในเครื่อง ไม่ส่งออกไปไหน

---

## ฟีเจอร์ (Features)

| | |
| --- | --- |
| **ดึงข้อมูลจากไฟล์ภาพอัตโนมัติ** | ลากรูปที่เจนจาก Stable Diffusion เข้ามา ระบบอ่าน metadata ในไฟล์แล้วเติม prompt, negative prompt, steps, sampler, CFG scale, seed และชื่อโมเดลให้เอง |
| **แกลเลอรีแบบ Pinterest** | เรียงแบบ masonry รองรับรูปหลายอัตราส่วน เลื่อนลงโหลดต่อเนื่อง และใช้ภาพย่อ (thumbnail) เพื่อให้โหลดไว |
| **แท็ก** | ติดแท็กได้หลายอันต่อรูป กดที่แท็กเพื่อกรอง และกรองหลายแท็กพร้อมกันเพื่อแคบผลลัพธ์ลง |
| **ค้นหาและกรอง** | ค้นหาตามชื่อ กรองตามหมวดหมู่ โมเดล หรือแท็ก — ทำงานฝั่งเซิร์ฟเวอร์ทั้งหมด |
| **ระบบเซนเซอร์ NSFW** | เบลอ / พิกเซล / ปิดทึบ ปรับความเข้มได้ กดดูทีละรูป มีสวิตช์เปิดปิดรวม และโหมดซ่อนถาวรที่กรองออกตั้งแต่ฝั่งเซิร์ฟเวอร์ |
| **ติดธง NSFW อัตโนมัติ** | ติ๊กช่อง NSFW ให้เองเมื่อเจอคำที่กำหนดไว้ใน prompt (แก้รายการคำได้ในหน้าตั้งค่า) |
| **หน้าดูรายละเอียด** | ดูรูปเต็ม ซูมด้วยลูกกลิ้งเมาส์ ลากเลื่อนได้ เห็นค่าทุกตัว และคัดลอก prompt ได้ในคลิกเดียว |
| **สำรองข้อมูล** | ดาวน์โหลดทั้งคลังเป็นไฟล์ .zip (ข้อมูล JSON + รูปทั้งหมด) |
| **UI สองภาษา** | ไทยเป็นหลัก มีอังกฤษกำกับ ธีมมืดสไตล์ code editor |

---

## เทคโนโลยีที่ใช้ (Tech stack)

| ส่วน | ใช้อะไร |
| --- | --- |
| **หน้าบ้าน** | Angular 19 (standalone components + signals), TypeScript (strict), Tailwind CSS |
| **หลังบ้าน** | ASP.NET Core 10 Minimal APIs, Entity Framework Core |
| **ฐานข้อมูล** | SQLite (ไฟล์เดียว ไม่ต้องติดตั้ง database server) |
| **รูปภาพ** | เก็บบนดิสก์ สร้าง thumbnail ด้วย SkiaSharp |
| **อ่าน metadata** | `exifr` (ทำงานในเบราว์เซอร์) |
| **คุณภาพโค้ด** | ESLint + Prettier, xUnit (backend), Karma + Jasmine (frontend), GitHub Actions CI |

---

## เริ่มใช้งาน (Getting started)

**ต้องมีก่อน:** [.NET SDK 10](https://dotnet.microsoft.com/download) และ [Node.js 20](https://nodejs.org/) ขึ้นไป

### Windows — คลิกเดียว

```bat
start-reprompt.bat
```

สคริปต์จะติดตั้ง dependency ที่ขาด เคลียร์พอร์ตที่ค้าง เปิดทั้งสองฝั่ง แล้วเปิดเบราว์เซอร์ให้เมื่อพร้อม

### รันแยกส่วน (Manual)

```bash
cd backend/RePrompt.Api && dotnet run
```

```bash
cd frontend && npm install && npm start
```

เปิด <http://localhost:4200> (API อยู่ที่ `http://localhost:5144`)

ฐานข้อมูลถูกสร้างและ migrate ให้อัตโนมัติตอนเปิดเซิร์ฟเวอร์ครั้งแรก — ไม่ต้องรัน `dotnet ef database update` เอง

### คำสั่งอื่น ๆ

```bash
dotnet test
```

```bash
npm test --prefix frontend
```

```bash
npm run lint --prefix frontend
```

---

## โครงสร้างโปรเจกต์ (Project structure)

```
backend/
  RePrompt.Api/
    Endpoints/      minimal API endpoints (prompts, uploads, backup)
    Services/       ImageStorageService — ทุกอย่างที่แตะดิสก์รวมอยู่ที่เดียว
    Dtos/           request models แยกจาก entity เพื่อกัน mass assignment
    Validation/     ตัวช่วยรัน DataAnnotations (minimal API ไม่รันให้เอง)
    Data/ Models/   DbContext และ entity (Prompt, Image, Tag)
    Migrations/     EF Core migrations
  RePrompt.Api.Tests/

frontend/src/
  app/core/         services (HTTP, settings, toast) และ TypeScript models
  app/features/     prompt-list (แกลเลอรี + modal), prompt-form, settings
  app/shared/       prompt-card, filter-bar, tag-input, confirm-dialog, nsfw-overlay
  environments/     API base url แยก dev/prod
```

---

## API

| Method | Route | คำอธิบาย |
| --- | --- | --- |
| `GET` | `/api/prompts` | รายการ prompt — `search`, `category`, `model`, `tags`, `includeNsfw`, `limit` (1–100), `offset` |
| `GET` | `/api/prompts/{id}` | prompt เดียว |
| `POST` | `/api/prompts` | สร้างใหม่ |
| `PUT` | `/api/prompts/{id}` | แก้ไข |
| `DELETE` | `/api/prompts/{id}` | ลบ พร้อมลบไฟล์ภาพและ thumbnail บนดิสก์ |
| `DELETE` | `/api/images/{id}` | ลบภาพเดียว |
| `GET` | `/api/suggestions` | ค่าที่เคยใช้ของ model / sampler / category / tag |
| `GET` | `/api/tags` | แท็กทั้งหมดพร้อมจำนวนที่ถูกใช้ |
| `POST` | `/api/upload` | อัปโหลดภาพ คืน url + thumbnail + ขนาดภาพ |
| `DELETE` | `/api/uploads/{fileName}` | ลบไฟล์ที่อัปโหลดค้างไว้แต่ยังไม่ได้ผูกกับ prompt |
| `GET` | `/api/export` | ดาวน์โหลดไฟล์สำรองทั้งหมดเป็น .zip |

ตัวอย่างคำขอทั้งหมดอยู่ใน [`RePrompt.Api.http`](backend/RePrompt.Api/RePrompt.Api.http)

---

## สำรองข้อมูล (Backup)

ข้อมูลอยู่ใน `backend/RePrompt.Api/reprompt.db` กับโฟลเดอร์ `wwwroot/uploads/` ซึ่งทั้งคู่ถูก gitignore ไว้
และเพราะ SQLite ใช้โหมด WAL การคัดลอกเฉพาะไฟล์ `reprompt.db` อาจทำให้ข้อมูลล่าสุดหายได้

ใช้ปุ่ม **ดาวน์โหลดไฟล์สำรอง** ในหน้าตั้งค่า (หรือเรียก `GET /api/export`) จะได้ .zip ที่มี `prompts.json`
(พร้อม `schemaVersion`) และรูปต้นฉบับทั้งหมด — thumbnail ไม่รวมมาด้วยเพราะสร้างใหม่ได้เสมอ

ตอนนี้รองรับเฉพาะ export ส่วนการกู้คืนต้องทำเอง

---

## ความปลอดภัย (Security)

โปรเจกต์นี้ออกแบบให้รันบนเครื่องตัวเอง และ **ไม่มีระบบ login** — ถ้าจะเอาไป deploy ให้คนอื่นเข้าถึง
ต้องเพิ่ม authentication ก่อนเสมอ

ถึงจะรันแค่บนเครื่องตัวเอง ก็ยังปิดช่องโหว่เหล่านี้ไว้ เพราะเว็บอื่นที่เปิดค้างอยู่ในเบราว์เซอร์เดียวกัน
ยิง request มาที่ localhost ได้ (CORS บล็อกแค่การ *อ่าน* คำตอบ ไม่ได้บล็อกการ *ส่ง*):

- ไฟล์อัปโหลดตรวจจาก **magic bytes** ในตัวไฟล์ ไม่ใช่ `Content-Type` ที่ client ส่งมา และตั้งชื่อไฟล์ใหม่ฝั่งเซิร์ฟเวอร์ทั้งหมด — ไฟล์ `.html` ที่อ้างว่าเป็นรูปจึงอัปโหลดไม่ได้
- เสิร์ฟ static file เฉพาะโฟลเดอร์รูป เฉพาะนามสกุลภาพ พร้อม `nosniff` และ CSP sandbox
- ทุก path ที่ไปแตะดิสก์ผ่าน `ImageStorageService` ที่ปฏิเสธทุกอย่างที่ไม่ใช่ชื่อไฟล์ธรรมดาในโฟลเดอร์นั้น แล้วเช็ค canonical path ซ้ำอีกชั้น
- ใช้ DTO แยกจาก entity เพื่อไม่ให้ client กำหนด `Id` หรือแนบ image graph มาเองได้
- `limit`/`offset` มีขอบเขต และ request body มีเพดานขนาด

---

## License

[MIT](LICENSE)
