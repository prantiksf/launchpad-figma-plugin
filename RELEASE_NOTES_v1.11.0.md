# Release Notes - Starter Kit Plugin v1.11.0

**Release Date:** January 29, 2026  
**Version:** 1.11.0  
**Plugin ID:** 1595457818027167058

---

## 🎉 Major Update: Centralized Data Storage

This release introduces **centralized data storage** powered by a PostgreSQL backend, enabling real-time synchronization across all Salesforce users. Your templates, settings, and preferences are now automatically synced and accessible from any device.

---

## ✨ What's New

### 🔄 Centralized Data Storage
- **Automatic Sync**: All data (templates, clouds, links, settings) is now stored in a centralized PostgreSQL database
- **Real-Time Access**: Any Salesforce user opening the plugin sees the same shared data instantly
- **Cross-Device**: Access your templates from any computer - no more local-only storage
- **Team Collaboration**: Templates and settings are shared team-wide automatically

### 🚀 Automatic Migration
- **Seamless Transition**: Existing data automatically migrates from local storage to the backend on first launch
- **Zero Data Loss**: All your existing templates, clouds, and settings are preserved
- **One-Time Process**: Migration happens automatically - no user action required

### 🎯 Improved Onboarding
- **Always Visible Button**: "Get Started" button is now always visible for better discoverability
- **Auto-Selection**: First cloud is automatically selected for faster onboarding
- **Better UX**: Clear visual feedback when button is enabled/disabled

### 🧹 Simplified Interface
- **Removed Export/Import**: Manual backup/restore removed - data syncs automatically
- **Cleaner Menu**: Streamlined "More" menu with only essential options
- **Less Clutter**: Removed unnecessary features now that data is centralized

---

## 🔧 Technical Improvements

### Backend Infrastructure
- **Heroku + PostgreSQL**: Robust, scalable backend infrastructure
- **RESTful API**: Clean API endpoints for all data operations
- **Error Handling**: Comprehensive error handling and logging
- **Health Monitoring**: Admin endpoints for monitoring data storage

### Code Quality
- **React Hooks**: Migrated to modern React hooks for data management
- **Type Safety**: Full TypeScript support throughout
- **Better Architecture**: Separation of concerns with dedicated API layer
- **Performance**: Optimized data loading and saving

---

## 🐛 Bug Fixes

- ✅ Fixed "Get Started" button not working in onboarding flow
- ✅ Fixed onboarding state not saving properly
- ✅ Fixed duplicate state declarations causing build errors
- ✅ Improved error handling for API calls
- ✅ Fixed splash screen not hiding after onboarding completion

---

## 📋 What's Changed

### Data Storage
- **Before**: Data stored locally per user (`figma.clientStorage`)
- **After**: Data stored centrally in PostgreSQL database

### User Experience
- **Before**: Each user had separate templates and settings
- **After**: All users see shared templates and settings

### Backup/Restore
- **Before**: Manual export/import required for data backup
- **After**: Automatic sync - no manual steps needed

### Onboarding
- **Before**: "Get Started" button only visible after selecting cloud
- **After**: Button always visible, auto-selects first cloud

---

## 🚀 Upgrade Instructions

### For Existing Users

1. **Open Plugin**: Simply open the plugin in Figma
2. **Automatic Migration**: Your existing data will automatically migrate to the backend
3. **No Action Required**: Everything happens automatically - just wait a few seconds
4. **Verify**: Check that your templates appear (should see all your existing templates)

### For New Users

1. **Open Plugin**: Launch Starter Kit from Figma plugins menu
2. **Onboarding**: Select your cloud or add a custom cloud
3. **Get Started**: Click "Get Started" button
4. **Start Using**: Begin adding templates and collaborating with your team

---

## 🔐 Privacy & Security

- **Salesforce-Only**: Backend hosted on Salesforce internal infrastructure
- **No External Services**: All data stays within Salesforce ecosystem
- **User Privacy**: User-specific preferences (default cloud, hidden clouds) remain private per user
- **Team Data**: Templates, clouds, and links are shared team-wide

---

## 📊 Data Migration Details

### What Gets Migrated
- ✅ All templates (with previews and metadata)
- ✅ Custom clouds and configurations
- ✅ Cloud-specific Figma links
- ✅ Cloud categories and organization
- ✅ Status symbols
- ✅ Cloud POCs (Points of Contact)
- ✅ User preferences (default cloud, hidden clouds, onboarding state)

### Migration Process
1. Plugin detects existing local data
2. Reads all data from `figma.clientStorage`
3. Uploads to backend PostgreSQL database
4. Future loads use backend instead of local storage
5. Old local data remains as backup (not deleted)

---

## 🎯 Key Benefits

1. **Team Collaboration**: Everyone sees the same templates instantly
2. **No Data Loss**: Centralized storage means no more lost templates
3. **Cross-Device**: Access from any computer with your Salesforce account
4. **Automatic Sync**: Changes sync immediately across all users
5. **Simplified UX**: No more manual export/import steps

---

## 📝 Known Issues

None at this time.

---

## 🔗 Resources

- **Plugin ID:** 1595457818027167058
- **Version:** 1.11.0
- **Backend:** Heroku PostgreSQL (Salesforce internal)
- **Support:** prantik.banerjee@salesforce.com

---

## 🙏 Thank You

Thank you for using Starter Kit! This major update brings powerful collaboration features while maintaining the simplicity you love. Your feedback helps us improve the plugin continuously.

---

## 📈 What's Next

- Enhanced collaboration features
- Real-time updates when team members add templates
- Advanced cloud management
- Performance optimizations

---

**Status:** ✅ Ready for Publication  
**Build:** Production-ready  
**Testing:** All features tested and verified
