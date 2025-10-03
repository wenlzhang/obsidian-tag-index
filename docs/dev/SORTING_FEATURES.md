# Tag Index Sorting Features

## Overview

Tag Index provides a **dual sorting system** that gives you complete control over how your tags and notes are organized. The two independent sorting systems allow you to customize the view to match your workflow.

## Quick Reference

| Sort Type | Button Location | Icon | Options | Default |
|-----------|----------------|------|---------|---------|
| **Tag Sort** | Left button in header | 📊 List icon | 7 methods | Custom order |
| **Note Sort** | Right button in header | ↕️ Arrow icon | 6 methods | Modified time (new to old) |

## Tag Sorting

### Purpose
Tag sorting controls the **order of tags** in your index. This determines which tags appear at the top of your list.

### Access
- **Quick sort**: Click the **left sort button** (list icon) in the tag panel header
- **Settings**: Settings → Tag Index → "Default tag sort method"

### Available Methods

#### 1. Custom Order (Default)
- **Description**: Manually arrange tags using drag and drop
- **Use case**: When you have a specific organization scheme in mind
- **Features**:
  - Drag tags up/down to reorder
  - Position is saved automatically
  - Visual cursor feedback (grab icon)
  - Works with both simple and nested tags
- **Note**: Drag-and-drop is **only available in this mode**

#### 2. Frequency (High to Low)
- **Description**: Most frequently used tags appear first
- **Use case**: Quickly access your most important/active tags
- **Algorithm**:
  - Counts number of notes containing each tag
  - Uses Obsidian's built-in cache (instant results)
  - Secondary sort: alphabetical by tag name
- **Example**: If `#project` appears in 20 notes and `#idea` in 5, `#project` comes first

#### 3. Frequency (Low to High)
- **Description**: Least frequently used tags appear first
- **Use case**: Finding underutilized or rare tags
- **Algorithm**: Same as above, but reversed
- **Example**: Useful for discovering tags you rarely use

#### 4. Tag Name (A to Z)
- **Description**: Alphabetical order ascending
- **Use case**: Finding tags by name quickly
- **Features**:
  - Natural number sorting (tag1, tag2, tag10 - not tag1, tag10, tag2)
  - Case-insensitive
  - Works with nested tags (e.g., `project/dev` comes before `project/personal`)

#### 5. Tag Name (Z to A)
- **Description**: Alphabetical order descending
- **Use case**: Reverse alphabetical browsing
- **Features**: Same as A-Z but reversed

#### 6. Added Time (New to Old)
- **Description**: Most recently added tags first
- **Use case**: Tracking new areas of interest
- **Features**:
  - Records timestamp when tag is added to index
  - Secondary sort: position (for tags added before this feature)
- **Example**: Tag added today appears before tag added last week

#### 7. Added Time (Old to New)
- **Description**: Oldest tags first
- **Use case**: Seeing your original tag system
- **Features**: Same as above, but reversed

### Visual Indicators

- **Checkmark (✓)**: Shows currently active sort method in the menu
- **Cursor**: Changes to "grab" in custom mode, normal in other modes
- **Tooltip**: Button tooltip shows current sort method

### Behavior Notes

- **Drag prevention**: In non-custom modes, attempting to drag shows a notice:
  > "Drag and drop is only available in custom sort mode. Change sort method to 'Custom order' to rearrange tags."
  
- **Hierarchical tags**: All sorting methods work correctly with nested tags (e.g., `project/dev/feature`)

- **Persistence**: Selected method is saved and restored across Obsidian sessions

## Note Sorting

### Purpose
Note sorting controls the **order of notes** displayed under each expanded tag. This is independent of tag sorting.

### Access
- **Quick sort**: Click the **right sort button** (arrow icon) in the tag panel header
- **Settings**: Settings → Tag Index → "Default note sort method"

### Available Methods

#### 1. File Name (A to Z)
- **Description**: Alphabetical order by filename (ascending)
- **Features**:
  - Natural number sorting (note1, note2, note10)
  - Case-insensitive
  - Uses basename (filename without .md extension)

#### 2. File Name (Z to A)
- **Description**: Alphabetical order by filename (descending)
- **Features**: Same as A-Z but reversed

#### 3. Modified Time (New to Old) - Default
- **Description**: Recently modified notes first
- **Use case**: Quick access to recently worked-on notes
- **Algorithm**: Sorts by file's last modification timestamp
- **Example**: Note modified 1 hour ago appears before note modified yesterday

#### 4. Modified Time (Old to New)
- **Description**: Oldest modified notes first
- **Use case**: Finding notes you haven't touched in a while
- **Features**: Same as above, but reversed

#### 5. Created Time (New to Old)
- **Description**: Recently created notes first
- **Use case**: Seeing your newest content
- **Algorithm**: Sorts by file creation timestamp
- **Example**: Note created today appears before note created last month

#### 6. Created Time (Old to New)
- **Description**: Oldest created notes first
- **Use case**: Viewing notes in chronological order
- **Features**: Same as above, but reversed

### Visual Indicators

- **Checkmark (✓)**: Shows currently active sort method in the menu
- **Tooltip**: Button tooltip shows current sort method

### Behavior Notes

- **Independent sorting**: Each tag can display notes in the same order (controlled by global setting)
- **Live updates**: Changing sort method immediately re-renders all expanded tags
- **Persistence**: Selected method is saved and restored across sessions

## Performance

### Tag Frequency Calculation

The frequency sorting feature is **highly optimized**:

```typescript
// Uses Obsidian's built-in cache API
const allTagCounts = this.app.metadataCache.getTags();
// Returns: { "#project": 15, "#status/done": 8, ... }
```

**Performance characteristics**:
- ⚡ **O(1) lookup** - instant for each tag
- ⚡ **Single API call** - all frequencies retrieved at once
- ⚡ **No file scanning** - uses pre-computed cache
- ⚡ **Always up-to-date** - Obsidian maintains the cache automatically

**Comparison** (for vault with 1000 files, 50 tags):

| Method | Time | Description |
|--------|------|-------------|
| Old (manual scan) | ~500-2500ms | Scanned every file |
| New (cache API) | <10ms | Direct cache lookup |

### Other Sorting Methods

All other sorting methods are also optimized:

- **Name sorting**: O(n log n) where n = number of tags/notes
- **Time sorting**: O(n log n) - direct timestamp comparison
- **Custom sorting**: O(n log n) - position-based

For typical usage (10-100 tags, 10-50 notes per tag), all operations are **imperceptible** (<50ms).

## Settings Integration

### Settings Tab

Both sorting methods have dedicated settings:

```
Settings → Tag Index

┌─────────────────────────────────────────┐
│ Default tag sort method                 │
│ ┌─────────────────────────────────────┐ │
│ │ Custom order                      ▼ │ │
│ └─────────────────────────────────────┘ │
│ Choose how tags in the index are       │
│ sorted. Custom order allows drag-and-   │
│ drop. Change via left sort button.      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Default note sort method                │
│ ┌─────────────────────────────────────┐ │
│ │ Modified time (new to old)        ▼ │ │
│ └─────────────────────────────────────┘ │
│ Choose how notes under each tag are     │
│ sorted. Change via right sort button.   │
└─────────────────────────────────────────┘
```

### Setting Changes

- **Immediate effect**: Changing settings re-renders the view instantly
- **No restart required**: Changes apply without reloading Obsidian
- **Preserved expansion**: Tag expansion state is maintained during re-render

## UI Layout

```
┌──────────────────────────────────────────┐
│  📊  ↕️                          ℹ️     │ ← Header
│  Tag  Note                      Info    │
│  Sort Sort                              │
├──────────────────────────────────────────┤
│  ▼ #project                         ✕   │ ← Tag (draggable in custom mode)
│     📄 Project plan.md                  │ ← Notes (sorted by note method)
│     📄 Roadmap 2024.md                  │
│  ▼ #status/done                     ✕   │
│     📄 Completed task.md                │
│  ▶ #idea                            ✕   │ ← Collapsed tag
└──────────────────────────────────────────┘
```

## Use Cases

### Scenario 1: Active Projects
**Goal**: Focus on frequently used tags

**Setup**:
- Tag sort: Frequency (high to low)
- Note sort: Modified time (new to old)

**Result**: Most used tags at top, recently edited notes shown first

### Scenario 2: Reference Archive
**Goal**: Browse tags alphabetically

**Setup**:
- Tag sort: Tag name (A to Z)
- Note sort: Created time (old to new)

**Result**: Easy alphabetical navigation, chronological note order

### Scenario 3: Custom Workflow
**Goal**: Personal organization system

**Setup**:
- Tag sort: Custom order
- Note sort: File name (A to Z)

**Result**: Manually ordered tags, alphabetically sorted notes

### Scenario 4: Discovery Mode
**Goal**: Find underutilized tags and old notes

**Setup**:
- Tag sort: Frequency (low to high)
- Note sort: Modified time (old to new)

**Result**: Rare tags shown first, oldest notes highlighted

## Tips & Best Practices

### 1. Combine Sort Methods Strategically
- Use frequency sorting to identify your most important tags
- Switch to custom order once you've identified your core tags
- Use note sorting by modified time to track active work

### 2. Leverage Drag-and-Drop Wisely
- In custom mode, group related tags together
- Put your most important tags at the top
- Create visual sections by grouping hierarchical tags

### 3. Use Frequency for Maintenance
- Periodically switch to frequency (low to high)
- Review rarely-used tags for relevance
- Consider removing or consolidating infrequent tags

### 4. Experiment with Different Combinations
- Tag sorting and note sorting are independent
- Try different combinations to find what works for your workflow
- Settings can be changed any time without losing data

### 5. Hierarchical Tag Considerations
- All sorting methods respect tag hierarchy
- Nested tags (e.g., `project/dev/feature`) maintain their structure
- Custom mode allows dragging entire hierarchies

## Keyboard Shortcuts

Currently, no keyboard shortcuts are assigned by default. You can add custom shortcuts via:

```
Settings → Hotkeys → Search "Tag Index"
```

Consider adding shortcuts for:
- Opening tag index panel
- Adding current tag to index

## Troubleshooting

### Tags Not Sorting
- **Check**: Ensure you've selected a non-custom sort method
- **Verify**: Click the sort button and confirm checkmark position
- **Try**: Switch to a different method and back

### Drag and Drop Not Working
- **Cause**: Probably not in "Custom order" mode
- **Fix**: Click left sort button → Select "Custom order"
- **Verify**: Cursor should show "grab" icon on hover

### Frequency Counts Seem Wrong
- **Check**: Frequency uses Obsidian's cache
- **Refresh**: Try closing and reopening Obsidian
- **Verify**: Check if tags exist in both inline and frontmatter formats

## Future Enhancements

Potential future features:
- Per-tag note sorting (different sort for each tag)
- Reverse sort toggle button
- Sort direction indicators
- Saved sort presets
- More sort criteria (file size, folder, etc.)

## Related Features

- **Line Content Display**: Shows where tags appear in notes
- **Hierarchical Tags**: Nested tag support with tree structure
- **Drag and Drop**: Manual tag reordering (custom mode only)

## Version History

- **v0.7.0**: Added tag sorting with 7 methods and note sorting with 6 methods
- **v0.7.0**: Optimized frequency calculation using Obsidian's cache API
- **v0.7.0**: Added drag-and-drop restriction for non-custom modes
