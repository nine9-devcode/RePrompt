# RePrompt: Stable Diffusion Prompt & Gallery Hub 🚀

**RePrompt** เป็นเว็บแอปพลิเคชันสำหรับจัดเก็บ ค้นหา และจัดการ Prompt จาก Stable Diffusion พร้อมรูปภาพประกอบ โดยเน้นความง่ายในการใช้งานและการดึงข้อมูลอัตโนมัติจากไฟล์ภาพ เพื่อให้คุณไม่พลาดทุกรายละเอียดของการสร้างสรรค์งานศิลปะ AI

---

## ✨ Key Features (ฟีเจอร์เด่น)

- **Auto Metadata Extraction**: ดึงค่า Prompt, Negative Prompt, Seed, Sampler และ Model จากรูปภาพที่อัปโหลดโดยอัตโนมัติ (รองรับ PNG/JPEG จาก Stable Diffusion)
- **Masonry Gallery**: แสดงผลรูปภาพในรูปแบบ Pinterest-style ที่รองรับขนาดภาพที่หลากหลาย
- **Advanced Search & Filter**: ค้นหา Prompt ตามชื่อ, หมวดหมู่ (Category) หรือชื่อโมเดล (Model Name) พร้อมระบบแบ่งหน้า (Server-side Pagination)
- **Bilingual UI**: รองรับภาษาไทย (ภาษาหลัก) และภาษาอังกฤษ
- **Quick Copy**: ปุ่มคัดลอก Prompt และ Negative Prompt แยกกันในคลิกเดียว
- **Responsive Design**: ธีมมืดสไตล์ IDE (Dark Mode) ที่สวยงามและใช้งานง่าย

---

## 🛠️ Technical Stack (เทคโนโลยีที่ใช้)

### Frontend (Angular)
- **Framework:** Angular 19 (Standalone Components)
- **Styling:** Tailwind CSS v3.4.17
- **State Management:** Angular Signals
- **Libraries:** `exifr` (สำหรับดึง metadata), `lucide-angular` (ไอคอน)

### Backend (.NET Core)
- **Framework:** ASP.NET Core 10 (Minimal APIs)
- **ORM:** Entity Framework Core
- **Database:** SQLite
- **Storage:** Local File System (จัดเก็บรูปภาพใน `wwwroot/uploads`)

---

## 🚀 Getting Started (วิธีการใช้งาน)

### วิธีที่ง่ายที่สุด (Windows)
หากคุณใช้ Windows สามารถรันโปรเจกต์ทั้ง Frontend และ Backend ได้พร้อมกันด้วยไฟล์เดียว:
1. ดับเบิลคลิกไฟล์ `start-reprompt.bat` ที่โฟลเดอร์ Root
2. ตัวสคริปต์จะทำการรัน Backend และ Frontend ให้โดยอัตโนมัติ
3. รอสักครู่จนกว่าหน้าจอจะเปิดเบราว์เซอร์ไปที่ `http://localhost:4200`

---

### วิธีการรันแบบแยกส่วน (Manual Setup)

#### 1. Backend (.NET Core)
```bash
cd backend/RePrompt.Api
dotnet restore
dotnet run
```
*Backend จะรันที่ `http://localhost:5000`*

#### 2. Frontend (Angular)
```bash
cd frontend
npm install
npm start
```
*Frontend จะรันที่ `http://localhost:4200`*

---

## 📂 Project Structure (โครงสร้างโปรเจกต์)

- `backend/`: ASP.NET Core API และการจัดการฐานข้อมูล SQLite
- `frontend/`: Angular Source Code และ Tailwind Configuration
- `start-reprompt.bat`: สคริปต์สำหรับรันโปรเจกต์แบบ One-click

---

## 📝 License
โปรเจกต์นี้สร้างขึ้นเพื่อการศึกษาและการใช้งานส่วนตัว
