# PK PPT Reports - Campaign Photo Management System

A full-stack TypeScript application for managing campaign photos and generating professional PDF and PowerPoint reports.

## 🚀 Features

### 📸 Photo Management
- **Campaign Management**: Create and manage marketing campaigns
- **Visit Tracking**: Track campaign visits with location and photo documentation
- **Folder-based Organization**: Organize photos into folders for better management
- **Photo Upload**: Support for multiple photo formats with automatic optimization
- **Photo Deletion**: Easy photo removal with confirmation

### 📊 Report Generation
- **Flexible PDF Reports**: Generate landscape PDF reports with 1-8 photos per page
- **PowerPoint Presentations**: Create professional PPT presentations with matching layouts
- **Customizable Layouts**: Support for various photo arrangements (1x1, 2x1, 2x2, 3x2, 4x2, etc.)
- **File Size Optimization**: Automatic image compression for smaller file sizes
- **Clean Filename Display**: URL decoding and extension removal for professional appearance

### 🎨 User Interface
- **Modern React UI**: Built with React 19, TypeScript, and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Photo Selection Dialog**: Interactive photo selection with thumbnail previews
- **Real-time Preview**: Live preview of report page count and layout

## 🏗️ Technical Architecture

### Frontend
- **React 19** with TypeScript
- **Vite 7** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **jsPDF** for PDF generation
- **PptxGenJS** for PowerPoint generation

### Backend
- **Node.js** with Express and TypeScript
- **Prisma ORM** with SQLite database
- **Multer** for file upload handling
- **Sharp** for image optimization
- **Supabase** for cloud storage (optional)

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/amitkkna/pkcampdata.git
   cd pkcampdata
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   cd server && npm install && cd ..
   ```

3. **Initialize database**
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma generate
   cd ..
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Development Mode
```bash
# Start both client and server
npm run dev

# Client: http://localhost:5173
# Server: http://localhost:3001
```

### Production Build
```bash
npm run build
npm run start
```

## 📁 Project Structure

```
pkpptreports/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and report generation
│   │   └── assets/         # Static assets
│   └── dist/              # Built client files
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   ├── prisma/           # Database schema and migrations
│   └── uploads/          # File uploads (local storage)
├── shared/               # Shared TypeScript types
└── docs/                # Documentation
```

## 🎯 Photo Layout Options

| Photos | Layout Description |
|--------|-------------------|
| 1 | Full page/slide |
| 2 | Side-by-side columns |
| 3 | One large + two stacked |
| 4 | 2×2 grid |
| 5 | 3 top + 2 bottom |
| 6 | 3×2 grid |
| 7 | 4 top + 3 bottom |
| 8 | 4×2 grid (maximum) |

## 📝 API Endpoints

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get campaign details

### Visits
- `GET /api/visits` - List visits for campaign
- `POST /api/visits` - Create visit with photos

### Folders
- `GET /api/folders` - List folders for campaign
- `POST /api/folders` - Create new folder
- `POST /api/folders/:id/photos` - Upload photos to folder
- `DELETE /api/folders/:id/photos/:photoId` - Delete photo

### Reports
- `POST /api/reports/generate` - Generate visit-based reports
- `POST /api/reports/folder` - Generate folder-based reports

## 🛠️ Development

### Database Management
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ by Global Digital Connect**
