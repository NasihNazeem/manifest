# Pre-Launch Checklist ✅

Use this checklist before deploying to production and submitting to the App Store.

---

## Backend Checklist

### Security
- [ ] `.env` file is NOT committed to git (check with `git status`)
- [ ] Environment variables are set in Render dashboard
- [ ] CORS is configured properly (not using `*` in production)
- [ ] Supabase Row Level Security (RLS) policies are reviewed
- [ ] No API keys or secrets in code

### Functionality
- [ ] All endpoints tested and working
- [ ] PDF parsing works with real documents
- [ ] Multi-device sync tested
- [ ] Shipment create/join/complete flow works
- [ ] Database queries are optimized
- [ ] Error handling is in place

### Performance
- [ ] Tested with large PDFs (>50 items)
- [ ] Tested with multiple concurrent users
- [ ] Database indexes are created
- [ ] API response times are acceptable (<1 second)

---

## Mobile App Checklist

### Configuration
- [ ] API URL points to production backend (not localhost!)
- [ ] Bundle identifier is unique (`com.yourcompany.manifest`)
- [ ] App name is finalized
- [ ] App icon is set (1024x1024px PNG)
- [ ] Splash screen is configured
- [ ] Version number is set in `app.json`

### Functionality
- [ ] PDF upload works
- [ ] Barcode scanning works on physical device
- [ ] Manual item search works
- [ ] Multi-device sync tested
- [ ] Export to CSV works
- [ ] All screens tested on iPhone and iPad
- [ ] Tested with poor/no internet connection
- [ ] Data persists after app restart
- [ ] Join shipment flow works

### User Experience
- [ ] Loading states are shown
- [ ] Error messages are user-friendly
- [ ] Success confirmations are clear
- [ ] Keyboard doesn't cover input fields
- [ ] All buttons are easily tappable (min 44x44pt)
- [ ] No spelling/grammar errors in UI

### Performance
- [ ] App launches in <3 seconds
- [ ] No crashes during testing
- [ ] Smooth scrolling with 100+ items
- [ ] Camera opens quickly
- [ ] No memory leaks (test in Instruments)

---

## App Store Submission Checklist

### Required Assets
- [ ] App icon (1024x1024px, no transparency)
- [ ] iPhone screenshots (6.7", 6.5", 5.5" displays)
- [ ] iPad screenshots (12.9" and 11" displays)
- [ ] App preview video (optional but recommended)

### Metadata
- [ ] App name (30 characters max)
- [ ] Subtitle (30 characters max)
- [ ] Description (4000 characters max)
- [ ] Keywords (100 characters, comma-separated)
- [ ] Support URL
- [ ] Privacy Policy URL (required!)
- [ ] Categories selected (primary and secondary)

### Legal
- [ ] Privacy policy created and hosted
- [ ] Terms of service (if needed)
- [ ] Age rating selected appropriately
- [ ] Export compliance information
- [ ] Content rights verified

### Testing
- [ ] Tested on TestFlight with at least 2 external testers
- [ ] No crashes reported in TestFlight
- [ ] All App Store review guidelines followed
- [ ] No private API usage
- [ ] No placeholder content

---

## Production Deployment Steps

### 1. Backend (Render)
```bash
# Make sure everything is committed
git status

# Push to GitHub
git add .
git commit -m "Production release v1.0.0"
git push

# Render will auto-deploy
# Watch logs: https://dashboard.render.com
```

### 2. Database (Supabase)
- [ ] Verify all tables exist
- [ ] Check indexes are created
- [ ] Review RLS policies
- [ ] Test with production data
- [ ] Set up backups (automatic on Supabase)

### 3. Mobile App (TestFlight → App Store)
```bash
cd manifest

# Update version in app.json
# version: "1.0.0"
# ios.buildNumber: "1"

# Build for production
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --profile production

# Test on TestFlight
# Then submit for App Review in App Store Connect
```

---

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor Render logs for errors
- [ ] Check Supabase usage metrics
- [ ] Monitor crash reports in App Store Connect
- [ ] Test all core features in production
- [ ] Respond to user feedback

### First Week
- [ ] Review analytics (if implemented)
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Gather user feedback
- [ ] Plan next update based on issues

---

## Emergency Rollback Plan

### If Backend Breaks
1. Check Render logs for errors
2. Roll back to previous deployment in Render dashboard
3. Fix issue locally and test
4. Redeploy when fixed

### If Mobile App Crashes
1. Check crash logs in App Store Connect
2. Release hotfix build immediately
3. Submit for Expedited Review (for critical bugs)
4. Notify users via App Store description update

---

## Support Contacts

**Render Support:** https://render.com/support
**EAS Support:** https://expo.dev/support
**Supabase Support:** https://supabase.com/support
**Apple Developer Support:** https://developer.apple.com/support

---

## 🎉 When Everything Is Checked

You're ready to launch! 🚀

**Last steps:**
1. Take a deep breath
2. Deploy backend to Render
3. Submit app to App Store
4. Celebrate! 🎊

**Remember:** The first version doesn't have to be perfect. Ship it, get feedback, and iterate!
