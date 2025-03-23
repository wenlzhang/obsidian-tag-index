# Obsidian Tag Index

Tag Index is a plugin for [Obsidian](https://obsidian.md) that allows you to create a separate list of important tags for quick access. It provides a streamlined way to organize and prioritize your most-used tags.

## Features

- Create a dedicated view for your important tags
- Add tags to your index directly from the editor or default tag pane
- Rearrange tags via drag and drop
- Click on a tag to see all notes using that tag
- Preview note content when hovering over note names
- User notifications when adding tags or when tags already exist

## How to use

1. Install the plugin from the Obsidian community plugins
2. Open the Tag Index view using:
   - The ribbon icon in the left sidebar
   - The command palette with "Open Tag Index"
3. Add tags to your index by:
   - Right-clicking on tags in the editor
   - Right-clicking on tags in the default tag pane
   - Using the "Add tag to Tag Index" command
4. Rearrange your tags by dragging and dropping them
5. Click on any tag to see a list of notes that use it
6. **Hover over a note name to preview its content**

## Tag handling

The plugin intelligently handles tag names in various formats:

- The plugin provides notifications when:
  - A tag is successfully added to the index
  - You attempt to add a tag that already exists in the index
  - The Tag Index view is not active when trying to add a tag

## Settings

- **Add new tags to top**: When enabled, new tags will be added to the top of the tag list. When disabled, they will be added to the bottom.

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings > Community plugins
2. Disable Safe mode if prompted
3. Click Browse and search for "Tag Index"
4. Click Install and then Enable

### Manual installation

1. Download the latest release from the [releases page](https://github.com/wenlzhang/obsidian-tag-index/releases)
2. Extract the zip into your Obsidian vault's `.obsidian/plugins` folder
3. Reload Obsidian (Ctrl/Cmd + R)
4. Enable the plugin in Obsidian settings

## Development

1. Clone this repository to your local machine
2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build the plugin:
```bash
npm run build
```

## Support

If you encounter any issues or have suggestions for improvements, please open an issue on the [GitHub repository](https://github.com/wenlzhang/obsidian-tag-index/issues).

## Support the developer

<a href='https://ko-fi.com/C0C66C1TB' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
