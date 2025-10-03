# Line content display implementation

## Overview

This feature displays the line or block content where tags appear in files, showing the actual text that contains each tag. When a file has multiple lines with the same tag, all matching lines are displayed.

## Implementation details

### Setting

- **Setting name**: Show line content
- **Default value**: `true`
- **Location**: `TagIndexSettings.showLineContent`
- **Description**: When enabled, displays the line or block content where each tag appears in the file

### Key components

#### 1. Line content extraction (`getTagLineContent`)

Located in `tagIndexView.ts`, this method extracts all lines containing a specific tag from a file:

```typescript
private async getTagLineContent(
    file: TFile,
    tagName: string,
): Promise<{ line: number; content: string }[]>
```

**Process**:
1. Reads the file content using `app.vault.read(file)`
2. Gets tag positions from metadata cache (`cache.tags`)
3. Extracts line content for each tag occurrence
4. Removes duplicates and sorts by line number
5. Returns array of `{line, content}` objects

**Features**:
- Only processes inline tags (tags in content, not frontmatter)
- Handles multiple occurrences of the same tag in different lines
- Returns lines sorted by line number for consistent ordering

#### 2. Display rendering

The line content is displayed within the note item container:

```typescript
if (this.plugin.settings.showLineContent) {
    const tagLineContent = await this.getTagLineContent(file, tagName);
    
    if (tagLineContent.length > 0) {
        // Create container with proper indentation
        const linesContainer = noteItem.createDiv({
            cls: "tag-index-line-content-container",
        });
        
        // Render each line
        for (const item of tagLineContent) {
            // Line number + content with markdown rendering
        }
    }
}
```

**Display elements**:
- **Container**: `.tag-index-line-content-container` - Groups all lines for a file
- **Line item**: `.tag-index-line-content` - Individual line display with box styling
- **Line number**: `.tag-index-line-number` - Displays 1-indexed line number
- **Line text**: `.tag-index-line-text` - Rendered markdown content

#### 3. Markdown rendering

Line content is rendered using Obsidian's `MarkdownRenderer`:

```typescript
await MarkdownRenderer.renderMarkdown(
    item.content,
    contentEl,
    file.path,
    this,
);
```

This ensures:
- Proper formatting of markdown elements (bold, italic, code, etc.)
- Consistent styling with Obsidian's UI
- Support for internal links and other markdown features

### CSS styling

The feature uses visual hierarchy to distinguish content from file names:

```css
/* Note item uses vertical layout */
.tag-index-note-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

/* Note header contains the file name */
.tag-index-note-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Container with left border and indentation */
.tag-index-line-content-container {
  margin-left: 20px;
  padding-left: 8px;
  border-left: 2px solid var(--background-modifier-border);
  gap: 6px;
}

/* Individual line with box styling */
.tag-index-line-content {
  padding: 8px 10px;
  background-color: var(--background-primary-alt);
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  font-size: 13px;
  line-height: 1.6;
}

/* Line number in monospace font */
.tag-index-line-number {
  color: var(--text-faint);
  font-family: var(--font-monospace);
  min-width: 40px;
  text-align: right;
  font-weight: 500;
}
```

**Visual design improvements**:
- **Vertical layout**: File name and line content stack vertically for clarity
- **Proper spacing**: 6-8px gaps between elements for breathing room
- **Indentation**: Lines indented 20px with 8px padding for clear hierarchy
- **Border**: Vertical border on the left creates visual grouping
- **Box styling**: Each line has rounded background box with proper padding
- **Hover effect**: Smooth transition with background and border color changes
- **Line numbers**: Right-aligned monospace font with 40px width for alignment
- **Typography**: 13px font size with 1.6 line height for readability

### Auto-refresh

The view automatically refreshes when file content changes:

#### Metadata change handler

```typescript
this.registerEvent(
    this.app.metadataCache.on("changed", this.metadataChangeHandler),
);
```

#### Debounced refresh

```typescript
private debouncedRefresh(): void {
    if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
        this.renderTagsAndRestoreExpansion();
    }, 500); // Wait 500ms after the last change
}
```

**Benefits**:
- Prevents excessive refreshes during rapid editing
- Only refreshes when tags are expanded
- Maintains expansion state during refresh
- Cleans up timeout on view close

## User experience

### Visual hierarchy

The implementation creates clear visual distinction between:
1. **File name**: File icon + link (top level)
2. **Line content**: Indented, bordered container (nested level)
3. **Individual lines**: Boxed content with line numbers

### Example display structure

```
📄 My Note
   ├─ 15: This is a line with #important tag
   ├─ 42: Another line with #important tag
   └─ 87: Yet another #important occurrence

📄 Another Note
   └─ 23: Content with #important tag
```

The layout uses a vertical structure:
1. File name appears on its own line with file icon
2. Line content appears below, indented with left border
3. Each line is displayed in a bordered box
4. Line numbers are right-aligned in monospace font

### Settings integration

Users can toggle the feature:
- **Settings → Show line content** toggle
- Changes take effect immediately
- View refreshes automatically when toggled

## Performance considerations

1. **Lazy loading**: Line content is only extracted when tags are expanded
2. **Debounced refresh**: Prevents excessive updates during editing (500ms delay)
3. **Selective refresh**: Only refreshes if expanded tags exist
4. **Efficient extraction**: Uses metadata cache for tag positions

## Edge cases handled

1. **Multiple tags per line**: Each line appears only once, even with multiple tags
2. **Empty lines**: Trimmed content displayed
3. **Very long lines**: Word wrap applied via CSS
4. **No inline tags**: Only frontmatter tags won't show line content
5. **File not readable**: Gracefully handles with empty array return

## Clickable line content

### Overview

Line content is now clickable, allowing users to quickly navigate to the exact location in the file. This feature includes configurable behaviors for different workflows.

### Settings

#### Line content click behavior

Two modes are available:

1. **Jump to line** (default)
   - Opens the file at the specified line
   - Places cursor at configured position
   - Simple and focused navigation

2. **Jump to line and search**
   - Opens the file at the specified line
   - Places cursor at configured position
   - Opens the search pane with tag query
   - Shows all occurrences across the vault
   - Enables multi-file review

#### Cursor position

Two options for cursor placement:

1. **End of line** (default)
   - Cursor placed at the end of the line
   - Useful for continuing to write
   - Natural reading flow

2. **Start of line**
   - Cursor placed at the beginning
   - Useful for editing from the start
   - Quick deletion or modification

### Implementation

#### Click handler

```typescript
private async handleLineContentClick(
    file: TFile,
    lineNumber: number,
    tagName: string,
): Promise<void> {
    const behavior = this.plugin.settings.lineContentClickBehavior;
    const cursorPos = this.plugin.settings.cursorPosition;

    // Open file and jump to line
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);

    // Get editor and set cursor
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.editor) return;

    const editor = view.editor;
    const line = editor.getLine(lineNumber);
    const column = cursorPos === "end" ? line.length : 0;

    editor.setCursor({ line: lineNumber, ch: column });
    editor.scrollIntoView(...);

    // Open search if configured
    if (behavior === "jumpAndSearch") {
        // Trigger search functionality
    }
}
```

#### Search integration

When "Jump to line and search" is enabled:

1. Checks if search pane exists
2. If exists: Sets query and reveals pane
3. If not: Opens search pane, waits, then sets query
4. Query format: `tag:tagname` (without #)

#### Visual feedback

CSS classes provide clear interaction cues:

```css
.tag-index-line-clickable {
  cursor: pointer;
}

.tag-index-line-clickable:hover {
  background-color: var(--interactive-hover);
  border-color: var(--interactive-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tag-index-line-clickable:active {
  background-color: var(--interactive-accent);
  transform: translateY(1px);
}
```

### User workflows

#### Workflow 1: Quick navigation
1. User sees interesting line content
2. Clicks on it
3. File opens at exact line
4. Cursor ready to edit

#### Workflow 2: Research mode
1. User wants to review all tag occurrences
2. Clicks on line content
3. File opens at that line
4. Search pane opens showing all matches
5. User can browse other occurrences

### Benefits

- **Faster navigation**: One-click access to exact location
- **Context awareness**: See content before jumping
- **Flexible workflows**: Choose behavior per use case
- **Visual feedback**: Clear hover and active states
- **Search integration**: Seamless cross-file exploration

## Future enhancements

Potential improvements:
- Syntax highlighting for code blocks
- Configurable line content preview length
- Option to show surrounding context (lines before/after)
- Display block content for block-level tags
- Middle-click to open in new pane

## Related files

- `src/settings.ts` - Setting definition
- `src/settingsTab.ts` - Settings UI
- `src/tagIndexView.ts` - Main implementation
- `styles.css` - Visual styling
