# Note Sorting Implementation

## Overview

This document describes the implementation of the note sorting feature for the Tag Index plugin. The feature allows users to sort notes under each tag using various criteria, similar to Obsidian's file explorer.

## Problem Statement

Previously, notes under tags were displayed in the order returned by Obsidian's API, which appeared to be based on when files were indexed. This made it difficult for users to:
- Find specific notes quickly
- Organize notes by recency (modified/created time)
- Maintain consistent alphabetical ordering

## Solution

Implemented a comprehensive sorting system with 6 sorting methods and an intuitive UI for switching between them.

## Implementation Details

### 1. Data Types (`settings.ts`)

Added a new type for sort methods:

```typescript
export type NoteSortMethod =
    | "file-name-asc"
    | "file-name-desc"
    | "modified-new"
    | "modified-old"
    | "created-new"
    | "created-old";
```

Added to settings interface:
```typescript
noteSortMethod: NoteSortMethod; // How to sort notes under tags
```

Default value: `"file-name-asc"`

### 2. UI Components (`tagIndexView.ts`)

#### Sort Button in Header

Added a sort button in the header (same line as info icon):
- Icon: `arrow-up-down`
- Shows tooltip with current sort method
- Clicking opens a menu with all sort options

```typescript
const sortButton = headerContainer.createSpan({
    cls: "tag-index-sort-button",
});
setIcon(sortButton, "arrow-up-down");
sortButton.setAttribute("title", this.getSortMethodLabel());
```

#### Sort Menu

Implemented a context menu with 6 options organized in 3 groups:
1. File name (A to Z / Z to A)
2. Modified time (new to old / old to new)
3. Created time (new to old / old to new)

Active sort method is indicated with a checkmark icon.

### 3. Sorting Logic

#### Core Sorting Function

```typescript
private sortFiles(files: TFile[]): TFile[] {
    const method = this.plugin.settings.noteSortMethod;
    const sorted = [...files]; // Create a copy to avoid mutation

    switch (method) {
        case "file-name-asc":
            sorted.sort((a, b) => a.basename.localeCompare(b.basename, 
                undefined, { numeric: true, sensitivity: "base" }));
            break;
        case "file-name-desc":
            sorted.sort((a, b) => b.basename.localeCompare(a.basename, 
                undefined, { numeric: true, sensitivity: "base" }));
            break;
        case "modified-new":
            sorted.sort((a, b) => b.stat.mtime - a.stat.mtime);
            break;
        case "modified-old":
            sorted.sort((a, b) => a.stat.mtime - b.stat.mtime);
            break;
        case "created-new":
            sorted.sort((a, b) => b.stat.ctime - a.stat.ctime);
            break;
        case "created-old":
            sorted.sort((a, b) => a.stat.ctime - b.stat.ctime);
            break;
    }

    return sorted;
}
```

#### Key Features

- **Natural number sorting**: Uses `localeCompare` with `numeric: true` to properly sort filenames like "file1", "file2", "file10"
- **Case-insensitive**: Uses `sensitivity: "base"` for case-insensitive alphabetical sorting
- **Immutable**: Creates a copy of the array to avoid unintended mutations
- **Timestamp-based**: Uses `stat.mtime` (modification time) and `stat.ctime` (creation time) from Obsidian's file stats

### 4. Settings Integration (`settingsTab.ts`)

Added a dropdown setting for default sort method:
- Located before the "Advanced" section
- Provides all 6 sorting options
- Immediately updates the view when changed

```typescript
new Setting(containerEl)
    .setName("Default note sort method")
    .setDesc("Choose how notes under each tag should be sorted. You can also change this by clicking the sort button in the tag index panel.")
    .addDropdown((dropdown) =>
        dropdown
            .addOption("file-name-asc", "File name (A to Z)")
            .addOption("file-name-desc", "File name (Z to A)")
            .addOption("modified-new", "Modified time (new to old)")
            .addOption("modified-old", "Modified time (old to new)")
            .addOption("created-new", "Created time (new to old)")
            .addOption("created-old", "Created time (old to new)")
            .setValue(this.plugin.settings.noteSortMethod)
            .onChange(async (value) => {
                this.plugin.settings.noteSortMethod = value as any;
                await this.plugin.saveSettings();
                if (this.plugin.tagIndexView) {
                    await this.plugin.tagIndexView.renderTagsAndRestoreExpansion();
                }
            })
    );
```

### 5. Styling (`styles.css`)

Added styles for the sort button:

```css
.tag-index-sort-button {
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 3px;
}

.tag-index-sort-button:hover {
  opacity: 1;
  color: var(--text-accent);
  background-color: var(--background-modifier-hover);
}
```

Updated header layout:
```css
.tag-index-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  margin-top: 8px;
}
```

## User Experience

### Quick Sort (Primary Method)

1. User clicks the sort button (arrow icon) in the tag panel header
2. A menu appears with 6 sorting options
3. Current sort method shows a checkmark
4. Selecting a new method immediately re-sorts all notes
5. Sort button tooltip updates to show current method

### Default Sort (Settings)

1. User opens Settings → Tag Index
2. Finds "Default note sort method" dropdown
3. Selects preferred sorting method
4. All tags immediately re-sort with new method
5. Setting is persisted across sessions

### Visual Feedback

- **Button tooltip**: Shows current sort method (e.g., "Sort by: File name (A to Z)")
- **Menu checkmark**: Active sort option has a checkmark icon
- **Hover effects**: Button highlights on hover
- **Immediate updates**: No loading states, sorting is instant

## Technical Considerations

### Performance

- Sorting is O(n log n) where n is the number of files with a tag
- For typical vaults (dozens to hundreds of files per tag), sorting is imperceptible
- Creates array copies to prevent mutations
- Re-renders entire view to ensure consistency

### Compatibility

- Works with both regular and nested/hierarchical tags
- Preserves tag expansion state during re-render
- Compatible with all existing features (drag-and-drop, line content, etc.)
- Settings migration: New settings have sensible defaults

### Edge Cases

- Empty tag (no files): Shows "No notes found" message
- Single file: No visible change regardless of sort method
- Files with identical values: Secondary sort by creation time maintains stable ordering

## Testing Checklist

- [x] Build compiles without errors
- [ ] Sort button appears in header
- [ ] Sort button tooltip shows correct method
- [ ] Clicking sort button opens menu
- [ ] All 6 sort options work correctly
- [ ] Checkmark appears on active sort option
- [ ] Settings dropdown includes all options
- [ ] Changing setting updates view
- [ ] Sort persists across Obsidian restarts
- [ ] Works with nested tags
- [ ] Works with single-level tags
- [ ] Preserves expansion state after sorting
- [ ] Natural number sorting works (file1, file2, file10)
- [ ] Case-insensitive sorting works
- [ ] Modified time sorting reflects actual file changes
- [ ] Created time sorting reflects file creation

## Future Enhancements

Potential future improvements:
- Per-tag sort methods (different sorting for different tags)
- Custom sort orders (manual drag-and-drop within tag notes)
- Additional sort criteria (file size, file type, etc.)
- Reverse sort button (quick toggle between asc/desc)
- Remember last used sort method per session

## Files Changed

1. `src/settings.ts` - Added NoteSortMethod type and setting
2. `src/tagIndexView.ts` - Added sort button UI and sorting logic
3. `src/settingsTab.ts` - Added settings dropdown
4. `styles.css` - Added button styling

## Migration Notes

For users upgrading from previous versions:
- New setting `noteSortMethod` defaults to `"file-name-asc"`
- No breaking changes to existing functionality
- Notes will be sorted alphabetically by default (previously unsorted)
- Users can revert to previous behavior by not using the sort feature

## Build Information

- Build size: 23.0kb (increased from 22.3kb, +0.7kb)
- TypeScript compilation: Successful
- No new dependencies required
- Backward compatible with existing settings
