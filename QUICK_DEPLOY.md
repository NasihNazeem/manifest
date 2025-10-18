# Quick Deploy Reference

## 🚀 Deploy Backend to Render

### One-Time Setup
```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push

# 2. Go to Render.com
# 3. New Web Service → Connect GitHub repo
# 4. Render auto-detects render.yaml ✅
# 5. Add environment variables:
#    - SUPABASE_URL
#    - SUPABASE_KEY
# 6. Click "Create Web Service"
```

### Future Updates
```bash
git add .
git commit -m "Update backend"
git push
# Render auto-deploys! 🎉
```

---

## 📱 Deploy Mobile App to TestFlight

### One-Time Setup
```bash
cd manifest
npm install -g eas-cli
eas login
eas build:configure
```

### Build & Submit
```bash
cd manifest

# Update version in app.json first!
# Then:
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

---

## 🔑 Important URLs

**Render Dashboard:** https://dashboard.render.com
**Supabase Dashboard:** https://supabase.com/dashboard
**App Store Connect:** https://appstoreconnect.apple.com
**EAS Dashboard:** https://expo.dev

---

## ⚡ Quick Troubleshooting

**Backend not responding?**
```bash
# Check Render logs
# Verify environment variables are set
# Make sure service is "Live" (green)
```

**Mobile app build failing?**
```bash
# Check bundle identifier in app.json
# Verify Apple Developer account is active
# Run: eas build --platform ios --clear-cache
```

**Supabase connection error?**
```bash
# Test credentials locally first
# Make sure SUPABASE_URL and SUPABASE_KEY are correct
# Check Supabase project is not paused
```
