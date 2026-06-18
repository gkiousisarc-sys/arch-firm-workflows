# 🚀 Setup Guide — From Zero to Running Platform
**Architecture Firm Athens | Construction Management Platform**
*Follow every step in order — takes ~15 minutes*

---

## PART 1 — Create the GitHub Repository

### Step 1 · Sign in to GitHub
Go to **https://github.com** and sign in to your account.

---

### Step 2 · Create a new repository
1. Click the **+** icon (top right) → **New repository**
2. Fill in:
   - **Repository name:** `arch-firm-workflows`
   - **Description:** `Architecture firm AI workflow platform — construction management`
   - **Visibility:** `Private` ← important, this is firm data
3. Check **✅ Add a README file**
4. Click **Create repository**

---

### Step 3 · Create the folder structure inside GitHub
Still on GitHub (in your browser), inside the new repo:

1. Click **Add file** → **Create new file**
2. In the filename field type: `construction-platform/README.md`
   (typing the `/` creates a subfolder automatically)
3. In the body paste: `# Construction Platform — placeholder`
4. Click **Commit changes** → **Commit directly to main**

Repeat to also create:
- `design-process/README.md` (paste same placeholder)
- `project-management/README.md`

Your repo now has this structure:
```
arch-firm-workflows/
├── README.md
├── construction-platform/
│   └── README.md
├── design-process/
│   └── README.md
└── project-management/
    └── README.md
```

---

### Step 4 · Upload the MD files from your computer
1. In the root of the repo, click **Add file** → **Upload files**
2. Drag and drop these 3 files (which you downloaded earlier):
   - `AGENTS_STRUCTURE.md`
   - `CONSTRUCTION_PLATFORM_SPEC.md`
   - `CLAUDE.md` ← (download this one too from the files above)
3. Click **Commit changes**

Also upload `CONSTRUCTION_PLATFORM_SPEC.md` inside the subfolder:
1. Click into `construction-platform/`
2. **Add file** → **Upload files** → upload `CONSTRUCTION_PLATFORM_SPEC.md`
3. Commit

---

### Step 5 · Invite your PM
1. In the repo, go to **Settings** → **Collaborators**
2. Click **Add people**
3. Enter your PM's GitHub username or email
4. Set role to **Write**
5. She'll receive an email invite — she accepts it and has full access

---

## PART 2 — Install Claude Code on Your Laptop

### Step 6 · Install (choose your OS)

**macOS** — open Terminal and run:
```bash
curl -fsSL https://claude.ai/install.sh | sh
```

**Windows** — open PowerShell (not CMD) and run:
```powershell
irm https://claude.ai/install.ps1 | iex
```
Then **close PowerShell and open a new one** (required — PATH needs to refresh).

**Verify it worked:**
```bash
claude --version
```
You should see a version number like `v2.1.x`

---

### Step 7 · Authenticate
Run:
```bash
claude
```
Your browser opens automatically. Sign in with your Claude.ai account (the same one with your Pro subscription). You'll be redirected back — done.

---

## PART 3 — Clone the Repo & Launch

### Step 8 · Clone your GitHub repo to your laptop
In Terminal (macOS) or PowerShell (Windows):

```bash
# Navigate to where you want the project folder to live
cd ~/Documents      # or wherever your work folders are

# Clone it (replace YOUR_USERNAME with your GitHub username)
git clone https://github.com/YOUR_USERNAME/arch-firm-workflows.git

# Enter the folder
cd arch-firm-workflows
```

---

### Step 9 · Launch Claude Code in the project
```bash
claude
```

Claude Code is now running inside your project folder. It can see all your files.

The first thing to run:
```
/init
```
This makes Claude Code read and understand the full project structure.

---

## PART 4 — Give Claude Code the Build Instructions

### Step 10 · Paste this exact prompt to start building

Copy and paste this into Claude Code:

```
Read the files CLAUDE.md, AGENTS_STRUCTURE.md, and 
construction-platform/CONSTRUCTION_PLATFORM_SPEC.md carefully.

Then build Phase 1 of the Construction Management Platform:
- Project setup form (name, address, start date, zones with areas)
- Subcontractor registry (name, trade, rate, assigned zones, dates)
- Basic Gantt schedule view with Greek public holidays pre-loaded
- Sidebar navigation between the three sections
- Dark professional UI appropriate for a construction management tool

Use React + Tailwind CSS for the frontend and Node.js/Express 
with SQLite for the backend. Put all files inside the 
construction-platform/ folder.

After Phase 1 is working and I confirm, we will move to Phase 2 
(Orders tracker + Cost dashboard).
```

---

### Step 11 · Review and approve changes
Claude Code will:
1. Show you a plan — read it, type `yes` to proceed
2. Create files one by one — you'll see diffs
3. Ask you to confirm before writing to disk
4. Tell you how to run it when done (usually `npm install` then `npm run dev`)

---

### Step 12 · Run the platform locally
When Claude Code finishes Phase 1, it will give you commands like:
```bash
cd construction-platform
npm install
npm run dev
```
Then open your browser at **http://localhost:3000**

---

## PART 5 — Your PM Gets Access

### Step 13 · She clones the same repo
She runs on her machine:
```bash
git clone https://github.com/YOUR_USERNAME/arch-firm-workflows.git
cd arch-firm-workflows
claude
```
She authenticates with her own Claude Pro account. She can then continue building, add inputs, or work on other agents.

---

### Step 14 · Syncing changes between you
When she (or you) make changes:
```bash
git add .
git commit -m "description of what changed"
git push
```

The other person pulls:
```bash
git pull
```

---

## Quick Reference Card

| What | Command |
|------|---------|
| Start Claude Code in project | `cd arch-firm-workflows && claude` |
| Initialize project context | `/init` |
| Check Claude Code version | `claude --version` |
| Run the platform | `cd construction-platform && npm run dev` |
| Save changes to GitHub | `git add . && git commit -m "note" && git push` |
| Get latest from GitHub | `git pull` |
| Check Claude Code health | `claude doctor` |

---

## File Locations After Setup

```
~/Documents/arch-firm-workflows/       ← your local folder
├── CLAUDE.md                          ← Claude Code reads this first every session
├── AGENTS_STRUCTURE.md                ← firm-wide agent map
├── CONSTRUCTION_PLATFORM_SPEC.md      ← full platform spec
├── construction-platform/             ← Claude Code builds here
│   ├── CONSTRUCTION_PLATFORM_SPEC.md
│   └── [platform code goes here]
├── design-process/                    ← next agent (future)
└── project-management/                ← future
```

---

## If You Get Stuck

- **Claude Code not found after install:** close terminal, open new one, try again
- **Auth fails:** run `claude logout` then `claude` again
- **GitHub permission denied on clone:** go to GitHub → Settings → SSH/Token and create a Personal Access Token, use it as password
- **Questions during build:** just type your question directly into Claude Code in plain language
