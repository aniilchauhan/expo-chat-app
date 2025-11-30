# 🚀 Complete Setup Guide: Expo Preview Build & Submit

## ✅ Setup Complete!

Your project is now fully configured for Expo builds. All files are in place:
- ✅ `app.json` - App configuration
- ✅ `eas.json` - Build profiles configured
- ✅ `.easignore` - Build artifacts excluded
- ✅ EAS CLI installed and logged in
- ✅ Project ID: `81dc5162-55d7-43af-ba59-3d3ea350bdbb`

## 🎯 How to Create a Preview Build

### Method 1: Web Dashboard (RECOMMENDED for Windows)

1. **Open the Expo Dashboard**
   - Go to: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds
   - Log in if needed

2. **Create a New Build**
   - Click the **"Create a build"** button
   - Select **Platform**: Android
   - Select **Build profile**: preview
   - Click **"Build"**

3. **Wait for Build to Complete**
   - Build typically takes 10-20 minutes
   - You'll see real-time progress in the dashboard
   - You'll get an email when it's done

4. **Download Your APK**
   - Once complete, click the build to see details
   - Click **"Download"** to get the APK file
   - Or use the QR code to install directly on your device

### Method 2: Command Line (If Web Dashboard doesn't work)

```powershell
# Make sure you're in the project directory
cd C:\Anil\projects\chat-app\expo-chat-app

# Run the build command
eas build --profile preview --platform android
```

**Note**: If you encounter path errors on Windows, use Method 1 (Web Dashboard) instead.

## 📱 How to Submit to Expo

After your build completes successfully:

### Option A: Share via Direct Link
1. Go to your build in the dashboard
2. Copy the **Install link**
3. Share this link with anyone
4. They can install directly on Android devices

### Option B: Submit via Command Line
```powershell
# Submit the latest build
eas submit --platform android --latest
```

## 🔍 Checking Build Status

### Web Dashboard
- Visit: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds
- See all builds, their status, and logs

### Command Line
```powershell
# List recent builds
eas build:list --limit 5

# View specific build details
eas build:view
```

## 💰 Build Quota

Free Expo accounts include:
- **30 builds per month** (total across all platforms)

Check your usage:
- Dashboard: https://expo.dev/accounts/anilchauhan.29.5/settings/billing
- If you've exceeded the quota, you'll need to:
  - Wait for monthly reset, OR
  - Upgrade to a paid plan

## 🐛 Troubleshooting

### "Build quota exceeded"
- Check: https://expo.dev/accounts/anilchauhan.29.5/settings/billing
- Wait for monthly reset or upgrade plan

### "Not logged in"
```powershell
eas login
```

### "Project not configured"
```powershell
eas build:configure
```

### Windows Path Errors
- Use the **Web Dashboard** method instead
- This is a known Windows long-path issue with EAS CLI

## 📦 Build Profiles Explained

Your `eas.json` has three profiles:

1. **development** - For development builds with dev client
2. **preview** - For internal testing (creates APK)
3. **production** - For Play Store submission

## 🎉 Quick Start Commands

```powershell
# Check if logged in
eas whoami

# Create preview build (Web Dashboard recommended)
# Visit: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds

# List builds
eas build:list

# View latest build
eas build:view

# Submit to Expo
eas submit --platform android --latest
```

## 📱 Installing on Your Device

After build completes:

1. **QR Code Method**
   - Open build in dashboard
   - Scan QR code with your Android device
   - Install directly

2. **Direct Download**
   - Download APK from dashboard
   - Transfer to device
   - Enable "Install from unknown sources"
   - Install APK

3. **Share Link**
   - Copy install link from dashboard
   - Send to testers
   - They can install directly

## 🔗 Important Links

- **Builds Dashboard**: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds
- **Project Settings**: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/settings
- **Billing/Quota**: https://expo.dev/accounts/anilchauhan.29.5/settings/billing
- **EAS Documentation**: https://docs.expo.dev/build/introduction/

## ✨ Your Project Details

- **App Name**: ChatApp
- **Package**: com.chatapp.mobile
- **Version**: 1.0.0
- **Project ID**: 7683e63e-c6c6-4ba0-b297-050b06734946
- **Account**: anilchauhan123

---

**Ready to build?** Go to the [Builds Dashboard](https://expo.dev/accounts/anilchauhan123/projects/chat-app/builds) and click "Create a build"!
