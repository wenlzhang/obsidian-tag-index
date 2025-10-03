# Quick Reference: Hierarchical Tags Update

## 🎯 Problems Solved

1. ✅ **Extra space** before tag label (`project/work/ urgent` → `project/work/urgent`)
2. ✅ **Confusing indentation** when parent doesn't exist  
3. ✅ **No auto-grouping** of related tags
4. ✅ **Manual parent insertion** required

---

## 🚀 What's New

### Smart Indentation
Tags only indent when their **immediate parent exists** in the index.

**Before:**
```
status
  project/work/urgent    ← Confusing! (no parent)
```

**After:**
```
status
project/work/urgent      ← No indent (parent missing)
```

**With parents:**
```
project
  project/work           ← Indented ✓
    project/work/urgent  ← Indented ✓
```

---

### Auto-Insert Parent Tags (Default: ON)
When you add `project/work/urgent`, plugin automatically adds:
- `project`
- `project/work`  
- `project/work/urgent`

**To toggle:** Settings → Tag Index → "Auto-insert parent tags"

---

### Sort Command
**Command:** "Sort tags by hierarchy"

Automatically reorganizes tags:
```
Before:           After:
status/done   →   project
project           ├─ project/work
status            status
                  ├─ status/done
```

**How to use:** Cmd+P → "Sort tags by hierarchy"

---

## 📋 Quick Actions

### Adding a Nested Tag
1. Right-click tag in tag pane (e.g., `urgent` under `project/work`)
2. Click "Add to tag index"
3. **Result:** `project`, `project/work`, and `project/work/urgent` all added

### Reorganizing Tags
1. Open command palette (Cmd/Cmd + P)
2. Type "Sort tags"
3. Select "Sort tags by hierarchy"
4. **Result:** All tags organized hierarchically

### Manual Control
1. Settings → Tag Index
2. Toggle OFF "Auto-insert parent tags"
3. **Result:** Only tags you explicitly add appear

---

## ⚙️ Settings

| Setting | Default | Location |
|---------|---------|----------|
| Auto-insert parent tags | ON | Settings → Tag Index |

---

## 🎮 Commands

| Command | Shortcut | What it does |
|---------|----------|--------------|
| Sort tags by hierarchy | Cmd+P → search | Reorganizes all tags by hierarchy |

---

## 💡 Tips

1. **Keep auto-insert ON** if you want proper hierarchy display
2. **Run sort command** after adding many tags manually
3. **Indentation appears** only when parent exists in index
4. **No extra spaces** in tag names anymore
5. **Backward compatible** - old tags still work

---

## 🔧 How to Test

1. **Build:** `npm run build`
2. **Reload:** Ctrl/Cmd + R in Obsidian
3. **Test:** Add a nested tag like `project/work/urgent`
4. **Verify:**
   - Parents auto-added ✓
   - Proper indentation ✓
   - No extra spaces ✓
   - Sort command works ✓

---

## 📊 Visual Comparison

### OLD BEHAVIOR
```
11Tag
├─ project/personal/ hobby    ← Extra space before "hobby"
├─ project/work/ normal        ← Extra space
├─ project/work/ urgent        ← Extra space
project                        ← Added manually
├─ status/ done                ← Indent even without parent!
status                         ← Added manually
```

### NEW BEHAVIOR  
```
11Tag
project
  project/personal
    project/personal/hobby     ← No extra space ✓
  project/work
    project/work/normal        ← No extra space ✓
    project/work/urgent        ← No extra space ✓
status
  status/done                  ← Indent only with parent ✓
```

---

## ❓ FAQ

**Q: Will this break my existing tags?**  
A: No! All existing tags work exactly the same.

**Q: Do I have to use auto-insert?**  
A: No, you can disable it in settings for manual control.

**Q: Can I still drag tags to reorder?**  
A: Yes! Drag-and-drop still works perfectly.

**Q: What if I want tags in custom order?**  
A: Don't run the sort command. Manual order is preserved.

**Q: Can I add only child tags without parents?**  
A: Yes, disable "Auto-insert parent tags" in settings.

---

## 🎉 Summary

**What changed:**
- Fixed extra space in tag display
- Added smart indentation (only when parent exists)
- Added auto-insert parent tags (optional)
- Added sort command for organization

**What stayed the same:**
- All existing features
- Drag-and-drop reordering
- Expand/collapse behavior  
- Tag operations (add, remove)

**Build status:** ✅ Ready to use (14.4kb)
