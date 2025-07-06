# Deployment Guide - Ink, Toner, & Moore

This guide will help you deploy the Ink, Toner, & Moore business management system to production.

## 🚀 Quick Deploy to Netlify (Recommended)

### 1. GitHub Repository Setup

1. Create a new repository on GitHub
2. Push this code to your repository:

```bash
git init
git add .
git commit -m "Initial commit: Ink, Toner, & Moore business system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ink-toner-moore.git
git push -u origin main
```

### 2. Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Netlify will auto-detect the build settings from `netlify.toml`
5. Click "Deploy site"

Your site will be live in minutes! 🎉

## 🔧 Environment Variables Setup

After deployment, you'll need to configure these environment variables in Netlify:

### Required for Production:
- `GOOGLE_SHEETS_ID` - Your Google Sheets spreadsheet ID
- `GOOGLE_SHEETS_API_KEY` - Your Google Sheets API key
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_API_KEY` - Your Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain

### Optional:
- `CUSTOM_DOMAIN` - Your custom domain name

## 📊 Google Sheets Setup

### 1. Create a Google Sheets Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Create these sheets (tabs):
   - `inventory`
   - `cartridges` 
   - `receipts`
   - `notes`
   - `stickyNotes`
   - `blogPosts`

### 2. Set up Headers

For each sheet, add headers in row 1:

#### Inventory Sheet:
```
id | category | brand | model | type | stockQuantity | reorderLevel | costPrice | sellPrice | supplier | lastUpdated | notes
```

#### Cartridges Sheet:
```
id | customerName | customerPhone | customerEmail | cartridgeType | quantity | status | dateReceived | estimatedCompletion | notes
```

#### Blog Posts Sheet:
```
id | title | content | excerpt | status | publishDate | author | tags
```

### 3. Get API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Google Sheets API
4. Create credentials (API Key)
5. Copy the spreadsheet ID from your Google Sheets URL

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Authentication
4. Add Email/Password sign-in method
5. Create your first admin user

### 2. Get Firebase Config

1. Go to Project Settings
2. Find your web app config
3. Copy the configuration values

## 🌐 Custom Domain Setup

### 1. In Netlify:
1. Go to Site Settings → Domain Management
2. Add your custom domain
3. Follow DNS configuration instructions

### 2. Update Environment Variables:
```
CUSTOM_DOMAIN=yourdomain.com
```

## 📱 Mobile Optimization

The system is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔒 Security Features

- HTTPS by default
- CORS protection
- Environment variable protection
- Firebase Authentication
- Content Security Policy headers

## 🔄 Development vs Production

### Development Mode:
- Uses mock data
- Authentication bypass available
- Detailed error messages
- Fast development cycles

### Production Mode:
- Real Google Sheets integration
- Full Firebase authentication
- Error logging
- Optimized performance

## 📈 Monitoring & Analytics

You can add these services:
- Google Analytics
- Netlify Analytics
- Error tracking (Sentry)
- Performance monitoring

## 🛠 Maintenance

### Regular Tasks:
1. Update dependencies monthly
2. Backup Google Sheets data
3. Monitor error logs
4. Check performance metrics
5. Update business information

### Troubleshooting:
- Check Netlify function logs
- Verify environment variables
- Test API connections
- Check Firebase authentication

---

## 🎯 Final Steps Checklist

- [ ] Repository created and code pushed
- [ ] Netlify site deployed
- [ ] Google Sheets created with proper structure
- [ ] Google Sheets API enabled and key obtained
- [ ] Firebase project created and configured
- [ ] Environment variables set in Netlify
- [ ] Custom domain configured (optional)
- [ ] First admin user created
- [ ] Staff members can log in
- [ ] Data is syncing properly
- [ ] All features tested in production

Need help? Check the issues section or contact support!