# Hover preview implementation

## Overview

The Tag Index plugin now uses Obsidian's native hover preview system for note links. This enables seamless integration with:
- **Page Preview core plugin** - Native Obsidian hover preview (enabled by holding Cmd/Ctrl)
- **Hover Editor plugin** - Third-party plugin that enhances hover previews
- Any other plugins that hook into Obsidian's `hover-link` event system

## Implementation details

### Changes made

1. **Updated `tagIndexView.ts`** (lines 408-438):
   - Replaced custom preview implementation with native Obsidian hover system
   - Added `internal-link` class to note links for proper styling
   - Set `data-href` attribute for Obsidian's hover preview system
   - Added `hover-link` event trigger that Obsidian uses for preview functionality

2. **Updated `styles.css`**:
   - Removed custom `.tag-index-note-preview` styles (no longer needed)
   - Removed mobile responsive styles for custom preview
   - Kept note link hover styles for visual feedback

### How it works

When a user hovers over a note link in the Tag Index:

1. The link has the `internal-link` class and proper attributes (`data-href`, `href`)
2. On `mouseover`, the plugin triggers Obsidian's `hover-link` event
3. Obsidian's hover preview system (or third-party plugins) intercepts this event
4. The preview is displayed according to user settings:
   - **Page Preview core plugin**: Hold Cmd (macOS) or Ctrl (Windows/Linux) while hovering
   - **Hover Editor**: Preview appears immediately on hover (if installed and configured)

### Benefits

- **Native integration**: Uses Obsidian's standard preview system
- **User preference**: Respects user's choice of preview method
- **Plugin compatibility**: Works with Hover Editor and other preview plugins
- **Less code**: Removed ~40 lines of custom preview code
- **Better UX**: Consistent behavior with rest of Obsidian

## Testing instructions

### Testing with Page Preview core plugin

1. Ensure "Page Preview" core plugin is enabled in Settings → Core plugins
2. Open Tag Index sidebar
3. Expand a tag to show notes
4. **Hold Cmd (macOS) or Ctrl (Windows/Linux)** and hover over a note link
5. Verify that the preview popover appears
6. Release Cmd/Ctrl and verify preview closes

### Testing with Hover Editor plugin

1. Install "Hover Editor" from Community Plugins
2. Configure Hover Editor settings as desired
3. Open Tag Index sidebar
4. Expand a tag to show notes
5. Hover over a note link (no need to hold Cmd/Ctrl)
6. Verify that Hover Editor's preview appears
7. Test any Hover Editor features (e.g., editing in hover)

### Testing link click behavior

1. Click on any note link in Tag Index
2. Verify the note opens in the main editor
3. Verify no errors in Developer Console (Cmd/Ctrl+Shift+I)

### Expected behavior differences

**Before (custom implementation)**:
- Preview appeared on hover immediately
- Preview was basic markdown render (500 chars)
- Preview styling was custom and separate
- No integration with preview plugins

**After (native implementation)**:
- Preview respects Page Preview plugin settings (requires Cmd/Ctrl hold)
- Preview can use Hover Editor if installed (no Cmd/Ctrl needed)
- Preview uses Obsidian's native styling and features
- Full integration with preview plugin ecosystem

## Code reference

### Key changes in tagIndexView.ts

```typescript
// Create internal link using Obsidian's native format
const link = noteItem.createEl("a", {
    text: file.basename,
    cls: "tag-index-note-link internal-link",
});

// Set attributes for Obsidian's hover preview system
link.setAttribute("data-href", file.path);
link.setAttribute("href", file.path);
link.setAttribute("target", "_blank");
link.setAttribute("rel", "noopener");

// Enable Obsidian's native hover preview
link.addEventListener("mouseover", (event: MouseEvent) => {
    this.app.workspace.trigger("hover-link", {
        event,
        source: TAG_INDEX_VIEW_TYPE,
        hoverParent: this,
        targetEl: link,
        linktext: file.path,
    });
});
```

## Troubleshooting

### Preview doesn't appear

1. **Check if Page Preview is enabled**: Settings → Core plugins → Page Preview
2. **Verify you're holding Cmd/Ctrl**: The core plugin requires this key
3. **Check Developer Console**: Look for any error messages
4. **Try with Hover Editor**: Install it to test without Cmd/Ctrl requirement

### Preview appears but doesn't show content

1. **Verify file exists**: Check if the note file is still in vault
2. **Check file permissions**: Ensure file is readable
3. **Reload Obsidian**: Restart Obsidian to refresh cache

### Hover Editor doesn't work

1. **Verify Hover Editor is installed and enabled**
2. **Check Hover Editor settings**: Some options may conflict
3. **Test in regular notes**: Verify Hover Editor works elsewhere

## Related files

- `/src/tagIndexView.ts` - Main implementation
- `/styles.css` - Link styling
- `/src/main.ts` - Plugin initialization
