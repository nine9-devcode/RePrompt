# Project: Stable Diffusion Prompt & Gallery Hub 🚀

ไฟล์นี้บันทึกภาพรวม ข้อกำหนด และสถาปัตยกรรมของโปรเจกต์สำหรับใช้เป็นคู่มือในการพัฒนาคลังแสงเก็บ Prompt และรูปภาพตัวอย่างจาก Stable Diffusion สำหรับใช้งานส่วนตัว

---

## 1. เป้าหมายของโปรเจกต์ (Project Goal)
สร้างเว็บแอปพลิเคชันส่วนตัว (Self-Hosted/Local) ชื่อว่า RePrompt สำหรับบันทึก, จัดระเบียบ, ค้นหา คลังข้อมูลคำสั่ง (Prompts) ที่ใช้กับ AI Image Generation (Stable Diffusion) พร้อมทั้งเก็บไฟล์ภาพผลงานที่เจนฯ ออกมาคู่กัน เพื่อความสะดวกในการหยิบกลับมาใช้งานซ้ำ (Reproduce) 

---

## 2. ข่อขอบเขตระบบและฟีเจอร์หลัก (System Features)

### 🎨 ฝั่งหน้าบ้าน (Angular)
* **หน้า Dashboard / แกลเลอรีรูปภาพ:** แสดงผลแบบ Masonry Layout (Pinterest Style), ธีม IDE Dark Theme, รองรับการดูรูปเต็ม (Modal) พร้อมระบบซูม (Mouse Wheel) และลากรูป (Pan)
* **ระบบจัดการ Prompt (CRUD):** 
  * หน้าฟอร์มแบบ Code Editor พร้อมระบบ Auto-Extract SD Metadata ดึงค่า Prompt, Seed, Model จากไฟล์ภาพอัตโนมัติ
  * ระบบ Autocomplete สำหรับ Model, Sampler และ Category โดยอิงจากข้อมูลเก่าในระบบ
  * ระบบจัดการภาพ NSFW: เบลอภาพแบบ Frosted Glass, มีสวิตช์เปิด/ปิดเซนเซอร์ และโหมดซ่อนถาวร (Strict Mode)
* **หน้าตั้งค่า (Settings):** ปรับระดับความเข้มของการเบลอ (Blur Intensity) ได้แบบ Real-time
* **ระบบแจ้งเตือน (Toast):** แจ้งเตือนการทำงาน (Copy, Save, Delete) แบบไม่ขัดจังหวะการใช้งาน
* **ระบบค้นหาและกรอง:** ค้นหาตามชื่อ, กรองตามหมวดหมู่ หรือโมเดล พร้อมระบบ Pagination (Load More)

---

## 3. เทคโนโลยีและเครื่องมือที่ใช้ (Tech Stack)

### 💻 Frontend
* **Framework:** Angular (Standalone Components)
* **Language:** TypeScript 100%
* **Styling:** Tailwind CSS v3.4 (Custom Dark Theme)
* **Library:** `exifr` สำหรับดึงข้อมูล Metadata จากรูปภาพ

### ⚙️ Backend & Storage
* **Language:** C# (.NET 10)
* **Framework:** ASP.NET Core (Minimal APIs)
* **ORM:** Entity Framework Core (EF Core)
* **Database:** SQLite
* **File Storage:** Local File System (`wwwroot/uploads`)

---

## 🗄️ 4. พิมพ์เขียวฐานข้อมูล (Database Schema)

### Table: Prompts (เก็บข้อความและพารามิเตอร์)
* `Id` (GUID / Int): คีย์หลัก
* `Title` (String): ชื่อเรียกผลงาน
* `PositivePrompt` (String): คำสั่งเชิงบวก
* `NegativePrompt` (String): คำสั่งเชิงลบ
* `Sampler` (String): ตัวสุ่มตัวอย่าง
* `Steps` (Int): จำนวนรอบ
* `CFGScale` (Float): ค่าความอิสระ
* `Seed` (String/Long): ค่า Seed
* `ModelName` (String): ชื่อโมเดล
* `Category` (String): หมวดหมู่ภาพ
* `IsNsfw` (Boolean): สถานะเนื้อหาไม่เหมาะสม (NSFW)
* `CreatedAt` (DateTime): วันที่บันทึก

### Table: Images (เก็บรูปภาพที่ผูกกับ Prompt - One-to-Many)
* `Id` (GUID / Int): คีย์หลัก
* `PromptId` (GUID / Int): คีย์นอก
* `ImageUrl` (String): พาธสำหรับเข้าถึงรูปภาพ

---

## 🛣️ แผนการพัฒนา (Development Roadmap)

- [x] **Phase 1-8:** โครงสร้างพื้นฐาน, API CRUD, ระบบอัปโหลด และ UI เบื้องต้น
- [x] **Phase 9:** ระบบ Category, Autocomplete และ Metadata รูปภาพ
- [x] **Phase 10:** ระบบค้นหา กรองข้อมูล และ Pagination
- [x] **Phase 11:** ระบบ Toast Notification
- [x] **Phase 12:** ระบบ Auto-Extract SD Metadata จากไฟล์ภาพ
- [x] **Phase 13:** การแสดงผล Masonry Layout (Pinterest Style)
- [x] **Phase 14:** ระบบจัดการเนื้อหา NSFW (Blur & Toggles)
- [x] **Phase 15:** หน้า Settings ปรับแต่ง Dynamic Blur
- [x] **Phase 16:** ระบบ Confirm Modal และปรับปรุง Gallery UI (Icon-based)
- [x] **Phase 17:** ระบบ Auto-Flag NSFW อัตโนมัติด้วยคำหลักในกล่องตั้งค่า (Keywords)
- [x] **Phase 18:** ระบบชิปตัวเลือกคำหลัก (Interactive Chips) สำหรับเลือก Category/Model/Sampler
- [x] **Phase 19:** ระบบลากวางไฟล์ภาพครอบคลุมทั้งหน้าจอ (Global Drag & Drop Overlay)
- [x] **Phase 20:** ปรับปรุงความเร็วฝั่งหลังบ้าน (AsNoTracking, composite index, parallel query optimization)
- [x] **Phase 21:** ตัวเซนเซอร์ภาพ NSFW หลากหลายสไตล์ (Blur, Pixelate, Solid Block) และจดจำสถานะการยกเลิกเซนเซอร์ชั่วคราว
- [x] **Phase 22:** ปรับปรุงปัญหาการคลิกซ้อน (Event Bubbling) บนการ์ดคลังภาพ
- [x] **Phase 23:** แก้ไขความปลอดภัยของเธรดฝั่งหลังบ้าน (EF Core Thread-safety) และการลบไฟล์อย่างปลอดภัย (Deferred File Deletions)
- [x] **Phase 24:** แก้ไขคอขวดประสิทธิภาพหน้าบ้าน (Pre-compute censor states) เพื่อหยุดวงจรคำนวณซ้ำใน Angular Change Detection
- [x] **Phase 25:** ระบบเลื่อนโหลดภาพอัตโนมัติ (Auto Infinite Scroll ด้วย IntersectionObserver)

