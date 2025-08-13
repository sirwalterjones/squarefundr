# Admin Debug Instructions

The database shows you're an admin, but the navbar isn't showing the link. Here's how to debug:

## 🔍 **Step 1: Check Browser Console**
1. Go to https://www.squarefundr.com and log in
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for any errors related to admin check or `/api/is-admin`

## 🍪 **Step 2: Check Cookies**
1. In DevTools, go to Application/Storage tab
2. Look under Cookies for your domain
3. Check if `sf_is_admin` cookie exists and equals `1`

## 🧪 **Step 3: Manual API Test**
1. While logged in, open browser console
2. Run this command:
   ```javascript
   fetch('/api/is-admin').then(r => r.json()).then(console.log)
   ```
3. Should return `{"isAdmin": true}` if working

## 🔧 **Step 4: Force Refresh Admin Status**
1. While logged in, run this in browser console:
   ```javascript
   localStorage.removeItem('sf:isAdminCache')
   document.cookie = 'sf_is_admin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
   window.location.reload()
   ```

## 📋 **What to Look For:**
- ❌ Console errors mentioning admin, timeout, or 500 errors
- ❌ Missing `sf_is_admin` cookie
- ❌ `/api/is-admin` returning `{"isAdmin": false}` when logged in
- ❌ Network timeouts to `/api/is-admin`

## 🚨 **Common Issues:**
1. **Cookie not set** - Admin check succeeded but cookie wasn't saved
2. **RLS policy blocking** - Database can't read user_roles table
3. **Stale cache** - LocalStorage has old false result
4. **Network timeout** - API call taking too long

Run these tests and let me know what you find!
