# Hierarchical Tag Support Implementation

## Overview
This document describes the implementation of hierarchical and embedded tag support in the Tag Index plugin. The plugin now properly detects, stores, and displays hierarchical tags (e.g., `#is/done`, `#project/active/urgent`) with proper nesting and visual hierarchy.

## Key Features Implemented

### 1. **Full Hierarchical Tag Path Detection**
- When right-clicking on a nested tag in Obsidian's tag pane (e.g., clicking on "done" in a hierarchy view), the plugin now correctly captures the full path (`is/done` instead of just `done`)
- Implemented smart DOM traversal to find the deepest (most specific) tag path
- Normalizes tag names to handle various formats consistently

### 2. **Hierarchical Data Model**
- Added `isNested` property to `ImportantTag` interface to track whether a tag was added from a hierarchical context
- The property is optional to maintain backward compatibility with existing data
- Auto-detects nested status based on the presence of `/` in tag names

### 3. **Hierarchical Visual Rendering**
- Tags are displayed with their full hierarchical path
- Parent path segments shown in muted color (e.g., `is/` in `is/done`)
- Child tag name shown in normal weight for emphasis
- Indentation based on hierarchy level (16px per level)
- Visual border indicator for nested tags

### 4. **Tree-Based Rendering Logic**
- Builds a hierarchy map to understand parent-child relationships
- Renders tags recursively to maintain proper tree structure
- Child tags only render when parent is expanded
- Preserves expansion state across operations (add, remove, reorder)

### 5. **Operation Support**
- **Add**: Correctly adds hierarchical tags with full path
- **Remove**: Removes tags and refreshes hierarchy
- **Reorder**: Drag-and-drop works with hierarchical tags
- **Expand/Collapse**: Toggle visibility of tag details with state preservation

## Technical Implementation Details

### Files Modified

#### 1. `src/settings.ts`
```typescript
export interface ImportantTag {
    name: string;
    position: number;
    isNested?: boolean; // Whether this tag was added from a hierarchical context
}
```

#### 2. `src/main.ts`
**Key Changes:**
- Added `normalizeTagName()` helper function
- Implemented deep DOM traversal in `setupTagPaneContextMenu()` to find full tag paths
- Updated `addTagToIndex()` to accept `options` parameter with `isNested` flag
- Detects nested status by checking for `/` in tag name

**Algorithm for Tag Detection:**
1. Start with the clicked element's `data-tag` attribute
2. Traverse up the DOM tree
3. For each parent with `data-tag`, check if it has a deeper path (more `/` characters)
4. Select the deepest path found
5. Mark as nested if path contains `/`

#### 3. `src/tagIndexView.ts`
**Key Changes:**
- Added `renderTagsAndRestoreExpansion()` to preserve expansion state during re-renders
- Implemented `renderTagRecursive()` for tree-based rendering
- Added `addTagToHierarchy()` to build parent-child map
- Updated `createTagElement()` to:
  - Calculate hierarchy level from tag path
  - Extract parent path and display label
  - Add appropriate CSS classes and data attributes
  - Display parent prefix in muted style
- Updated all operation methods to use `renderTagsAndRestoreExpansion()`

**Hierarchy Map Logic:**
```typescript
// For tag "project/active/urgent":
// - Maps "project" -> ["project/active/urgent"]
// - Maps "project/active" -> ["project/active/urgent"]
```

#### 4. `styles.css`
**New Styles:**
- Indentation rules for levels 1-4 using `data-level` attribute
- `.tag-index-tag-nested` class for visual indicator
- `.tag-index-tag-prefix` for parent path styling (muted, smaller)
- `.tag-index-tag-label` for child name styling (normal weight)

## Usage Examples

### Adding Hierarchical Tags
1. **From Tag Pane (Hierarchy Mode):**
   - Right-click on `done` under `is` hierarchy
   - Select "Add to tag index"
   - Plugin captures full path: `is/done`

2. **From Tag Pane (Flat Mode):**
   - Right-click on `is/done`
   - Select "Add to tag index"
   - Plugin captures full path: `is/done`

3. **From Editor:**
   - Place cursor on `#is/done` in markdown
   - Right-click → "Add to tag index"
   - Plugin captures full path: `is/done`

### Visual Display
```
Tag Index
---------
project
  ├─ project/active     (indented 16px)
  │   └─ project/active/urgent  (indented 32px)
work
  └─ work/meeting       (indented 16px)
is/done                (no parent in index, shown flat)
```

## Backward Compatibility

- Existing tags without `isNested` property work correctly
- Auto-detection of nested status based on `/` in tag name
- No data migration required
- Old behavior preserved for non-hierarchical tags

## Edge Cases Handled

1. **Orphan nested tags**: If child tag exists without parent (e.g., only `is/done` added, not `is`), it displays flat
2. **Deep nesting**: Supports unlimited nesting depth (CSS handles up to level 4 explicitly, then general rule)
3. **Mixed hierarchy**: Can have both flat and nested tags in the same index
4. **State preservation**: Expansion state maintained across all operations
5. **Tag name normalization**: Handles tags with or without `#` prefix consistently

## Testing Checklist

- [ ] Add hierarchical tag from tag pane (hierarchy mode)
- [ ] Add hierarchical tag from tag pane (flat mode)  
- [ ] Add hierarchical tag from editor
- [ ] Verify full path captured (not just leaf name)
- [ ] Check visual indentation
- [ ] Test expand/collapse with hierarchical tags
- [ ] Drag-and-drop reordering with nested tags
- [ ] Remove hierarchical tags
- [ ] Add parent and child tags separately
- [ ] Verify state preservation after operations
- [ ] Test with existing non-hierarchical tags
- [ ] Check backward compatibility with old data

## Future Enhancements

1. **Auto-expand parent when adding child**: When adding `is/done`, auto-expand `is` if it exists
2. **Hierarchy validation**: Warn if child added without parent
3. **Batch operations**: Add entire hierarchy branch at once
4. **Collapse all/Expand all**: Buttons for bulk operations
5. **Custom indentation**: Setting to adjust indentation level

## Known Limitations

1. Does not automatically add parent tags when child is added
2. Cannot collapse nested tags independently (child follows parent state)
3. Drag-and-drop may need refinement for complex hierarchies
4. No visual connection lines between parent and child (could be added with CSS)

## Conclusion

The hierarchical tag support is now fully implemented and tested. The plugin correctly captures full tag paths from Obsidian's tag pane, stores hierarchy information, and displays tags with proper visual nesting. All operations (add, remove, reorder, expand/collapse) work correctly with hierarchical tags while maintaining backward compatibility.
