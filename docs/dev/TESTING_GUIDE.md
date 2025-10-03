# Testing Guide for Hierarchical Tag Support

## Quick Start

1. Build the plugin: `npm run build`
2. Reload Obsidian (Ctrl/Cmd + R)
3. Open Tag Index panel
4. Create test tags in your vault

## Test Scenarios

### Scenario 1: Basic Hierarchical Tag Detection
**Setup:**
1. Create a note with tags: `#is/done`, `#is/doing`, `#is/todo`
2. Open the default tag pane (View → Tags)
3. Make sure tags are displayed in hierarchy mode (should see `is` as parent with children)

**Test:**
1. Right-click on `done` (under `is` hierarchy)
2. Select "Add to tag index"
3. **Expected**: Tag appears as `is/done` in Tag Index (not just `done`)
4. **Expected**: Tag shows with muted prefix `is/` and bold `done`

### Scenario 2: Multiple Levels
**Setup:**
1. Create tags: `#project/work/urgent`, `#project/work/normal`, `#project/personal/hobby`

**Test:**
1. Add `project/work/urgent` to index
2. **Expected**: Shows with indentation (32px from left)
3. **Expected**: Prefix shows `project/work/` in muted color
4. **Expected**: Label shows `urgent` in normal weight

### Scenario 3: Mixed Flat and Hierarchical
**Setup:**
1. Create tags: `#important`, `#is/done`, `#project/work`

**Test:**
1. Add all three tags to index
2. **Expected**: `important` shows without indentation
3. **Expected**: `is/done` shows with 16px indentation
4. **Expected**: `project/work` shows with 16px indentation
5. All tags should be draggable and reorderable

### Scenario 4: Expand/Collapse with Hierarchical Tags
**Test:**
1. Add `#is/done` to tag index
2. Click to expand the tag
3. **Expected**: Shows notes with `#is/done` tag
4. Add another tag to index (e.g., `#important`)
5. **Expected**: `is/done` remains expanded
6. Click to collapse `is/done`
7. **Expected**: Notes section hides
8. Remove `important` tag
9. **Expected**: `is/done` remains collapsed

### Scenario 5: Parent Without Children
**Test:**
1. Add only `is` (not `is/done`) to index
2. **Expected**: Shows as `is` without special nesting
3. **Expected**: No indentation (level 0)

### Scenario 6: Child Without Parent
**Test:**
1. Add `is/done` to index (without adding `is`)
2. **Expected**: Shows as `is/done` with indentation
3. **Expected**: Prefix shows `is/` in muted color
4. Click to expand
5. **Expected**: Shows notes tagged with `#is/done`
6. **Expected**: Does NOT show notes tagged with only `#is`

### Scenario 7: From Editor Context Menu
**Test:**
1. Create a note with `#is/done` in the content
2. Place cursor on the tag
3. Right-click → "Add to tag index"
4. **Expected**: Tag appears as `is/done` in index
5. **Expected**: Proper hierarchical display

### Scenario 8: Drag and Drop with Hierarchical Tags
**Test:**
1. Add tags: `#is/done`, `#is/doing`, `#project/work`
2. Drag `is/doing` above `is/done`
3. **Expected**: Order changes
4. **Expected**: Both tags remain properly indented
5. Drag `project/work` between the `is/*` tags
6. **Expected**: Order changes, all formatting preserved

### Scenario 9: Remove Hierarchical Tag
**Test:**
1. Add `#is/done` and `#project/work`
2. Expand `is/done` to show notes
3. Remove `project/work`
4. **Expected**: `project/work` disappears
5. **Expected**: `is/done` remains expanded with notes visible
6. Remove `is/done`
7. **Expected**: All tags removed, shows empty state

### Scenario 10: Backward Compatibility
**Test:**
1. If you have existing tags in the index (from before this update)
2. Open Tag Index
3. **Expected**: Old tags display correctly
4. **Expected**: No errors in console
5. Add a new hierarchical tag
6. **Expected**: Works alongside old tags
7. Expand/collapse old tags
8. **Expected**: State preserved for all tags

## Visual Checks

### Indentation
- Level 0 (no `/`): No indentation
- Level 1 (one `/`): 16px left margin
- Level 2 (two `/`): 32px left margin
- Level 3 (three `/`): 48px left margin
- Level 4+ (four+ `/`): 64px left margin + border

### Colors
- Parent prefix (e.g., `is/` in `is/done`): Muted color, 70% opacity, 0.9em size
- Tag label (e.g., `done` in `is/done`): Normal text color, 500 weight
- Nested tag border: 2px left border in modifier border color

### Hover States
- Tag header hover: Background changes to secondary-alt
- Remove button hover: Opacity increases, color changes to error
- Chevron icon: Changes from right to down when expanded

## Console Checks

Open DevTools (Ctrl/Cmd + Shift + I) and check for:
- [ ] No TypeScript errors
- [ ] No runtime errors when adding tags
- [ ] No errors when expanding/collapsing
- [ ] No errors when dragging/reordering
- [ ] No errors when removing tags

## Debug Mode

Enable debug mode in settings:
1. Settings → Tag Index → Advanced → Debug mode
2. Check console for log messages:
   - Settings loading/saving
   - Tag operations
   - Hierarchy detection

## Common Issues & Solutions

### Issue: Tag shows only leaf name (e.g., `done` instead of `is/done`)
**Solution:** This was the bug we fixed. Ensure you're running the latest build.

### Issue: Indentation not showing
**Check:** 
- Verify `data-level` attribute is set on tag element
- Check CSS is loaded (inspect element)
- Clear cache and reload

### Issue: Expand/collapse loses state
**Check:**
- Should be fixed with `renderTagsAndRestoreExpansion()`
- If still occurs, check console for errors

### Issue: Drag and drop not working
**Check:**
- Make sure dragging from the tag header, not the remove button
- Check for JavaScript errors in console

## Performance Testing

For vaults with many tags:
1. Add 10+ hierarchical tags
2. Expand all tags
3. **Expected**: No noticeable lag
4. Add another tag
5. **Expected**: All previous tags remain expanded
6. Drag to reorder
7. **Expected**: Smooth performance

## Final Verification

After all tests:
- [ ] Build completes without errors: `npm run build`
- [ ] No TypeScript errors in IDE
- [ ] All scenarios pass
- [ ] No console errors
- [ ] Plugin can be disabled and re-enabled without issues
- [ ] Settings persist after Obsidian restart

## Reporting Issues

If you find issues:
1. Note the exact steps to reproduce
2. Check console for errors (copy full error)
3. Note your Obsidian version
4. Note your vault size (number of tags)
5. Export tag index settings (if relevant)
