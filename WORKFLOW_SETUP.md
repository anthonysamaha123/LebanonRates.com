# GitHub Actions Workflow Setup

## ⚠️ Workflow File Push Issue

GitHub requires special permissions to push workflow files via API. The workflow file needs to be added manually or through the GitHub web interface.

## ✅ Solution: Add Workflow File via GitHub UI

### Option 1: Create via GitHub Web Interface (Recommended)

1. Go to: https://github.com/anthonysamaha123/LebanonRates.com
2. Click **"Add file"** → **"Create new file"**
3. Path: `.github/workflows/store-history.yml`
4. Copy and paste the contents from `.github/workflows/store-history.yml` in your local repo
5. Click **"Commit new file"**

### Option 2: Use GitHub CLI (if installed)

```bash
gh workflow create .github/workflows/store-history.yml
```

### Option 3: Manual Push (if you have workflow scope)

If you have the proper GitHub token with workflow scope, you can push directly.

## 📋 Workflow File Contents

The workflow file is located at: `.github/workflows/store-history.yml`

**Key Features:**
- Runs every 15 minutes automatically
- Fetches latest gold prices
- Stores history in `data/gold-history.json`
- Commits and pushes changes automatically

## ✅ After Adding the Workflow

1. Go to **Actions** tab in GitHub
2. You should see "Store Gold Price History" workflow
3. Click on it and verify it's enabled
4. The workflow will run automatically every 15 minutes

## 🔧 Enable Workflow Permissions

1. Go to: Settings → Actions → General
2. Under "Workflow permissions":
   - Select: ✅ "Read and write permissions"
   - Select: ✅ "Allow GitHub Actions to create and approve pull requests"
3. Save changes

---

**Note:** All other code has been successfully pushed! Only the workflow file needs manual addition.
