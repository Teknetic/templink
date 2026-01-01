# Deploy to Render - Simple Steps

## Step 1: Sign Up for Render
1. Go to: https://render.com
2. Click "Get Started"
3. Sign up with your email (FREE - no credit card needed!)

## Step 2: Create the Deployment Zip

**In Windows Explorer:**
1. Open folder: C:\CREATE
2. Select these files/folders:
   - package.json
   - package-lock.json
   - src (folder)
   - public (folder)
   - render.yaml
   - .env.example

3. Right-click → "Compress to ZIP file"
4. Name it: templink.zip
5. Save to Desktop

**IMPORTANT: Do NOT include:**
- ❌ node_modules
- ❌ data folder
- ❌ .git folder
- ❌ test files

## Step 3: Deploy to Render

1. Login to Render.com dashboard
2. Click "New +" (top right)
3. Select "Web Service"
4. Choose "Deploy without Git"
5. Upload your templink.zip file
6. Configure:
   - Name: templink
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free
7. Click "Create Web Service"

## Step 4: Wait (5-10 minutes)
Render will:
- Install dependencies
- Build your app
- Give you a public URL!

## Done! 🎉
You'll get a URL like: https://templink-xxxx.onrender.com
