# Deployment Guide: Manifest App

This guide walks you through deploying your backend to Render and your mobile app to TestFlight.

---

## Part 1: Deploy Backend to Render

### Prerequisites
- GitHub account
- Render account (sign up at https://render.com - it's free!)
- Your code pushed to a GitHub repository

### Step 1: Push Your Code to GitHub

```bash
# If you haven't already initialized git
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**IMPORTANT:** Make sure your `.env` file is NOT committed! Check that it's listed in `.gitignore`.

### Step 2: Create a New Web Service on Render

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if you haven't already
4. Select your repository (`manifest` or whatever you named it)
5. Click **"Connect"**

### Step 3: Configure the Service

Render will auto-detect your `render.yaml` file. Configure these settings:

**Basic Settings:**
- **Name:** `manifest-backend` (or your choice)
- **Region:** Choose closest to your location (Oregon, Frankfurt, Singapore, Ohio)
- **Branch:** `main`
- **Root Directory:** Leave empty (we handle this in build command)
- **Runtime:** Node
- **Build Command:** `cd backend && npm install`
- **Start Command:** `cd backend && npm start`

**Plan:**
- Select **"Free"** to start (you can upgrade later)

### Step 4: Set Environment Variables

Click on **"Environment"** tab and add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `3000` | Render will override this automatically |
| `CORS_ORIGIN` | `*` | For now, allow all origins |
| `SUPABASE_URL` | `your_supabase_url` | Copy from Supabase dashboard |
| `SUPABASE_KEY` | `your_supabase_key` | Copy from Supabase dashboard |

**To get your Supabase credentials:**
1. Go to your Supabase project
2. Click Settings (⚙️) → API
3. Copy **Project URL** → paste as `SUPABASE_URL`
4. Copy **anon public** key → paste as `SUPABASE_KEY`

### Step 5: Deploy

1. Click **"Create Web Service"** at the bottom
2. Render will start building and deploying your backend
3. Wait 2-3 minutes for the build to complete
4. Once deployed, you'll see a URL like: `https://manifest-backend.onrender.com`

### Step 6: Test Your Deployment

Open your browser and visit:
```
https://YOUR-APP-NAME.onrender.com/
```

You should see:
```json
{
  "status": "ok",
  "message": "PDF Parser & Sync API is running",
  "endpoints": { ... }
}
```

**Test getting shipments:**
```
https://YOUR-APP-NAME.onrender.com/api/shipments
```

Should return:
```json
{
  "success": true,
  "shipments": []
}
```

### Step 7: Update Mobile App API URL

Now update your mobile app to use the production backend:

**File:** `manifest/config/api.ts`

```typescript
export const API_CONFIG = {
  // Change this to your Render URL:
  PDF_PARSER_URL: 'https://YOUR-APP-NAME.onrender.com/api/parse-pdf',
};
```

**IMPORTANT:** Replace `YOUR-APP-NAME` with your actual Render service name!

---

## Part 2: Deploy Mobile App to TestFlight

### Prerequisites
- Apple Developer Account ($99/year)
- Mac with Xcode installed
- EAS (Expo Application Services) account

### Option A: Using EAS Build (Recommended - No Mac Needed!)

#### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

#### Step 2: Login to EAS

```bash
cd manifest
eas login
```

#### Step 3: Configure EAS

```bash
eas build:configure
```

This creates an `eas.json` file. Update it to:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildType": "release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

#### Step 4: Update app.json

Make sure your `manifest/app.json` has proper bundle identifier:

```json
{
  "expo": {
    "name": "Manifest App",
    "slug": "manifest-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.manifest",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.manifest",
      "versionCode": 1
    }
  }
}
```

#### Step 5: Build for iOS

```bash
cd manifest
eas build --platform ios --profile production
```

This will:
1. Upload your code to EAS servers
2. Build the iOS app in the cloud
3. Give you a download link when complete (~10-15 minutes)

#### Step 6: Submit to TestFlight

Once the build completes:

```bash
eas submit --platform ios --profile production
```

This will automatically submit your app to TestFlight!

#### Step 7: Add Testers in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to **TestFlight** tab
4. Click **Internal Testing** or **External Testing**
5. Add testers by email
6. They'll receive an email to download TestFlight and install your app

### Option B: Using Xcode (Mac Required)

If you prefer building locally:

#### Step 1: Generate Native iOS Project

```bash
cd manifest
npx expo prebuild
```

#### Step 2: Open in Xcode

```bash
open ios/manifest.xcworkspace
```

#### Step 3: Configure Signing

1. In Xcode, select your project
2. Go to **Signing & Capabilities**
3. Select your **Team**
4. Make sure **Automatically manage signing** is checked

#### Step 4: Archive and Upload

1. In Xcode menu: **Product** → **Archive**
2. When archive completes, click **Distribute App**
3. Select **App Store Connect**
4. Select **Upload**
5. Follow the wizard to upload to TestFlight

---

## Part 3: Ongoing Deployments

### Update Backend (Render)

Render auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update backend"
git push
```

Render will automatically rebuild and redeploy!

### Update Mobile App (EAS)

```bash
cd manifest
# Increment version in app.json first!
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

---

## Troubleshooting

### Backend Issues

**Build fails on Render:**
- Check the build logs in Render dashboard
- Make sure all dependencies are in `backend/package.json`
- Verify environment variables are set correctly

**API not responding:**
- Check if service is running (green status in Render)
- Verify Supabase credentials are correct
- Check logs: Render Dashboard → Logs tab

**CORS errors:**
- Update `CORS_ORIGIN` environment variable
- For production, set it to your specific domain instead of `*`

### Mobile App Issues

**Build fails on EAS:**
- Check `eas build` logs
- Make sure `app.json` has valid bundle identifier
- Verify all dependencies are installed

**TestFlight upload fails:**
- Make sure you have a valid Apple Developer account
- Check that bundle identifier matches in App Store Connect
- Verify your Apple Team ID is correct

**App crashes on device:**
- Check API URL is pointing to production Render URL
- Make sure you're not using `localhost` in production
- Check device logs in Xcode → Devices

---

## Free Tier Limitations

### Render Free Tier:
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- 750 hours/month free (more than enough for one service)

**Solution:** Upgrade to paid plan ($7/month) for always-on service

### Supabase Free Tier:
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth
- Unlimited API requests

**This is plenty for starting out!**

---

## Next Steps

1. ✅ Backend deployed to Render
2. ✅ Mobile app on TestFlight
3. 🎯 Test with real users
4. 📊 Monitor usage in Supabase dashboard
5. 🚀 Submit to App Store when ready!

---

## Support

If you run into issues:
- Render docs: https://render.com/docs
- EAS docs: https://docs.expo.dev/build/introduction/
- Supabase docs: https://supabase.com/docs
