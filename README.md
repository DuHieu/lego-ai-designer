# 🧱 LEGO AI Designer

> **AI-Powered 3D LEGO Design Studio & Step-by-Step Assembly Manual Generator**  
> Thiết kế mô hình LEGO 3D bằng đa dạng nhà cung cấp AI & tự động tạo file hướng dẫn lắp ráp từng bước (Step by Step).

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r168-000?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 English Overview

**LEGO AI Designer** turns natural language descriptions, reference photos, and ideas into physically valid, buildable 3D LEGO creations. Powered by Three.js and official LDraw part geometries, the studio checks for physical connectivity, support stability, and collisions in real-time.

Crucially, it **automatically sequences the assembly process into step-by-step building instructions** (one or more pieces per step), highlighting newly added pieces, listing required parts per step, and exporting to industry-standard formats including **LDraw (`.ldr` with `0 STEP`)** for LeoCAD / Studio 2.0, **Interactive HTML manuals**, **Markdown**, and **JSON**.

### ✨ Key Features

1. 🤖 **Multi-Provider AI Engine**:
   - **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini`
   - **Google Gemini**: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-pro` (via OpenAI-compatible endpoint)
   - **Anthropic Claude**: `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-5-haiku`
   - **DeepSeek**: `deepseek-chat` (DeepSeek-V3), `deepseek-reasoner` (DeepSeek-R1)
   - **Ollama (Local Offline)**: `llama3.3`, `qwen2.5`, `deepseek-r1:8b`, `mistral` (completely free, private, no API key needed)
   - **OpenRouter**: Access to 200+ AI models
   - **Groq**: Ultra high-speed LPU inference
   - **Custom OpenAI-Compatible**: vLLM, LMStudio, LocalAI, or custom proxy

2. 📐 **Real 3D LEGO & Physics Engine**:
   - Built on official LDraw specifications with stud & tube connectivity rules.
   - Physical stability & overhang checking: prevents floating bricks.
   - 3D Voxel collision matrix for accurate boundary checking.
   - Full brick editing: move, rotate, duplicate, recolor, and delete in 3D.
   - Official LEGO color palette with authentic color codes.

3. 📖 **Step-by-Step Instruction Manuals ("Hướng dẫn Step by Step")**:
   - Automated bottom-up, layer-by-layer assembly sequencing.
   - **Interactive 3D Step Player**: Navigate through steps (`Prev` / `Next` or arrow keys), with newly placed bricks highlighted in high-contrast orange.
   - **Bill of Materials (BOM)**: Comprehensive part inventory and per-step parts list.
   - **Multi-Format Export**:
     - 📄 **LDraw (`.ldr` / `.mpd`)**: Includes official `0 STEP` delimiter comments. Can be opened directly in **LeoCAD**, **BrickLink Studio 2.0**, **LPub3D**, or **LDCad** as a native multi-step building guide!
     - 🌐 **Interactive Standalone HTML**: Single-file offline manual with isometric diagrams, parts checklist, and responsive mobile-ready layout.
     - 🖨️ **Printable Booklet**: Optimized for browser "Print to PDF" with clean A4 landscape page layout.
     - 📝 **Markdown Manual**: Ready for GitHub documentation and build logs.
     - 📦 **JSON Specification**: Machine-readable format for automation and robotic brick builders.

4. 🌍 **Multilingual (i18n)**:
   - Full support for **Tiếng Việt**, **English**, and **中文**.

---

## 🇻🇳 Giới thiệu tiếng Việt

**LEGO AI Designer** là công cụ thiết kế LEGO 3D thông minh, cho phép bạn biến ý tưởng hoặc hình ảnh phác thảo thành mô hình LEGO thực tế với kết cấu vững chắc (đã qua kiểm tra vật lý chống lơ lửng, chống va chạm).

Đặc biệt, hệ thống **tự động phân tích và tạo file sách hướng dẫn lắp ráp từng bước (Step-by-Step Manual)**:
- Người dùng có thể xem trực quan trên trình duyệt từng bước một (chi tiết mới được đánh dấu viền cam nổi bật).
- Xuất file **LDraw (`.ldr`) chuẩn `0 STEP`** để mở trực tiếp trong **LeoCAD**, **BrickLink Studio 2.0** hoặc **LPub3D**.
- Xuất file **HTML độc lập**, file **Markdown**, hoặc in trực tiếp ra **PDF booklet**.

---

## 🚀 Quick Start / Bắt đầu nhanh

### 1. Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm hoặc pnpm

### 2. Cài đặt & Khởi chạy

```bash
# Clone repository
git clone https://github.com/DuHieu/lego-ai-designer.git
cd lego-ai-designer

# Cài đặt dependencies
npm install

# Khởi chạy server phát triển
npm run dev
```

Mở trình duyệt tại: `http://localhost:5173/`

### 3. Cấu hình AI Provider

1. Bấm vào biểu tượng **Cài đặt AI (Settings)** ở góc trên thanh công cụ.
2. Chọn nhà cung cấp AI mong muốn:
   - **OpenAI**: Nhập API key `sk-...`
   - **Google Gemini**: Nhập API key từ Google AI Studio
   - **DeepSeek**: Nhập API key từ platform.deepseek.com
   - **Anthropic Claude**: Nhập API key `sk-ant-...`
   - **Ollama (Cục bộ)**: Khởi chạy Ollama (`ollama run llama3.3`), chọn tab Ollama (không cần API key!)
   - **OpenRouter / Groq / Custom**: Nhập key và endpoint tương ứng.
3. Bấm **Kiểm tra kết nối (Test connection)** để xác thực.

---

## 🛠️ Scripts hữu ích

```bash
npm run dev                  # Khởi chạy Vite dev server
npm run build                # Kiểm tra TypeScript và đóng gói production
npm run lint                 # Kiểm tra ESLint
npm run validate:builds      # Kiểm tra kết cấu vật lý và dữ liệu các mô hình mẫu
npm run profile:performance  # Đo đạc hiệu năng xử lý hình học LDraw
```

---

## 📂 Cấu trúc dự án / Project Structure

```text
lego-ai-designer/
├── public/
│   └── ldraw/               # Dữ liệu hình học & màu sắc LDraw chính thức
├── src/
│   ├── components/
│   │   ├── BrickScene.tsx       # Không gian hiển thị 3D Three.js
│   │   ├── ControlPanel.tsx     # Bảng điều khiển prompt, AI & danh mục gạch
│   │   ├── BrickEditorPanel.tsx # Thanh công cụ di chuyển, xoay, đổi màu gạch
│   │   └── BrickGlyph.tsx       # Biểu tượng vector hiển thị hình dáng viên gạch
│   ├── data/
│   │   ├── basicBricks.ts       # Định nghĩa các viên gạch tiêu chuẩn (1x1, 2x4, plates, slopes...)
│   │   └── officialPartColors.ts# Bảng màu LEGO chính thức theo tiêu chuẩn Rebrickable/LDraw
│   ├── lib/
│   │   ├── aiProviders.ts       # Cấu hình danh sách các nhà cung cấp AI & presets
│   │   ├── llmConfig.ts         # Lưu trữ & tải cấu hình AI an toàn trên localStorage
│   │   ├── llmGenerator.ts      # Xử lý prompt, gửi API request & chuẩn hóa mô hình
│   │   ├── manualSerializer.ts  # Tạo hướng dẫn lắp ráp (LDraw 0 STEP, HTML, Markdown, JSON)
│   │   ├── planUtils.ts         # Thuật toán kiểm tra va chạm, trọng lực, liên kết stud/tube
│   │   ├── structuralGrid.ts    # Cấu trúc Voxel 3D kiểm soát không gian
│   │   └── i18n.tsx             # Hỗ trợ đa ngôn ngữ (Tiếng Việt, English, 中文)
│   ├── types/
│   │   └── bricks.ts            # Hệ thống Typescript types cho mô hình, bước lắp, màu sắc
│   ├── App.tsx                  # Giao diện chính và các modal (Manual, Settings, Library)
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 📤 Hướng dẫn xuất file và mở trên LeoCAD / Studio 2.0

1. Sau khi AI thiết kế mô hình hoặc bạn tùy chỉnh xong trong không gian 3D:
2. Bấm vào nút **Hướng dẫn lắp ráp (Build Manual)** trên thanh điều khiển.
3. Trong cửa sổ hướng dẫn:
   - Bạn có thể bấm **Bước trước (Prev)** / **Bước tiếp theo (Next)** để xem từng chi tiết được gắn vào mô hình.
   - Bấm **Xuất LDraw (.ldr)** để tải file mô hình có chứa các lệnh `0 STEP`.
   - Mở phần mềm **LeoCAD** hoặc **BrickLink Studio 2.0**, chọn `File -> Open` và chọn file `.ldr` vừa tải về. LeoCAD/Studio sẽ tự động hiển thị từng bước tương ứng với thanh trượt bước lắp ráp!
   - Bấm **Xuất HTML** để tạo một trang web tài liệu lắp ráp hoàn chỉnh dùng offline hoặc in ra giấy.

---

## 📄 Bản quyền / License

Dự án được phát hành theo giấy phép [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và đóng góp!
