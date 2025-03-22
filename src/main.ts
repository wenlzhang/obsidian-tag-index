import {
    Plugin,
    MarkdownView,
    Menu,
    FuzzySuggestModal,
    TFile,
    WorkspaceLeaf,
    setIcon,
    App,
    MenuItem,
    Events,
    Editor,
    FuzzyMatch,
    Point,
    EditorPosition,
    TagCache,
} from "obsidian";
import { TagIndexSettings, DEFAULT_SETTINGS, ImportantTag } from "./settings";
import { TagIndexView, TAG_INDEX_VIEW_TYPE } from "./tagIndexView";
import { TagIndexSettingTab } from "./settingsTab";

export default class TagIndexPlugin extends Plugin {
    settings: TagIndexSettings;
    tagIndexView: TagIndexView | null = null;

    async onload() {
        await this.loadSettings();

        this.registerView(TAG_INDEX_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
            this.tagIndexView = new TagIndexView(leaf, this);
            return this.tagIndexView;
        });

        // Add ribbon icon for opening tag index
        this.addRibbonIcon("tag", "Open Tag Index", () => {
            this.activateView();
        });

        // Add command for opening tag index
        this.addCommand({
            id: "open-tag-index-view",
            name: "Open Tag Index",
            callback: () => {
                this.activateView();
            },
        });

        // Add command for adding a tag to the index
        this.addCommand({
            id: "add-tag-to-index",
            name: "Add tag to Tag Index",
            callback: () => {
                const modal = new TagSuggestModal(this);
                modal.open();
            },
        });

        // Add settings tab
        this.addSettingTab(new TagIndexSettingTab(this.app, this));

        // Add context menu item to tags in editor
        this.registerEvent(
            this.app.workspace.on(
                "editor-menu",
                (menu: Menu, editor: Editor, view: MarkdownView) => {
                    if (!view.file) return;

                    // Get cursor position
                    const cursor = editor.getCursor();

                    // Use Obsidian's metadata to find tags
                    const cache = this.app.metadataCache.getFileCache(
                        view.file,
                    );
                    if (!cache || !cache.tags) return;

                    // Find if cursor is within a tag position
                    const tagUnderCursor = this.findTagAtPosition(
                        cache.tags,
                        cursor,
                    );

                    if (tagUnderCursor) {
                        menu.addItem((item: MenuItem) => {
                            item.setTitle("Add to Tag Index")
                                .setIcon("plus")
                                .onClick(() => {
                                    this.addTagToIndex(tagUnderCursor);
                                });
                        });
                    }
                },
            ),
        );

        // Setup the tag pane context menu
        this.setupTagPaneContextMenu();

        // Try to activate view after plugin is loaded
        this.app.workspace.onLayoutReady(() => {
            this.activateView();
        });
    }

    // Helper to find a tag at the cursor position
    findTagAtPosition(
        tags: TagCache[],
        position: EditorPosition,
    ): string | null {
        for (const tag of tags) {
            // Check if position is within tag boundaries
            if (
                // Same line
                tag.position.start.line === position.line &&
                tag.position.end.line === position.line &&
                // Within column range
                tag.position.start.col <= position.ch &&
                tag.position.end.col >= position.ch
            ) {
                return tag.tag;
            }
        }
        return null;
    }

    setupTagPaneContextMenu() {
        // We need to observe the DOM to find tag elements
        this.registerDomEvent(document, "contextmenu", (event: MouseEvent) => {
            // Check if this is a tag in the tag pane
            const element = event.target as HTMLElement;
            const tagElement = element.closest(".tag-pane-tag");

            if (tagElement) {
                // This is a tag in the tag pane
                event.preventDefault();

                // Get the tag name
                const tagName = tagElement.textContent?.trim();
                if (!tagName) return;

                // Create and show context menu
                const menu = new Menu();

                menu.addItem((item: MenuItem) => {
                    item.setTitle("Add to Tag Index")
                        .setIcon("plus")
                        .onClick(() => {
                            // Add the # prefix if needed
                            const tagToAdd = tagName.startsWith("#")
                                ? tagName
                                : `#${tagName}`;
                            this.addTagToIndex(tagToAdd);
                        });
                });

                // Show the menu at the cursor position
                menu.showAtMouseEvent(event);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        // Clean up when plugin is disabled
        this.app.workspace.detachLeavesOfType(TAG_INDEX_VIEW_TYPE);
    }

    async activateView() {
        // Check if view is already open
        const leaves = this.app.workspace.getLeavesOfType(TAG_INDEX_VIEW_TYPE);

        if (leaves.length > 0) {
            // Focus on the existing view
            this.app.workspace.revealLeaf(leaves[0]);
            return;
        }

        // Open a new leaf in the right sidebar
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: TAG_INDEX_VIEW_TYPE,
                active: true,
            });
            this.app.workspace.revealLeaf(leaf);
        }
    }

    async addTagToIndex(tagName: string) {
        // Ensure the tag index view is available
        if (!this.tagIndexView) {
            await this.activateView();
            // If we still don't have the view, exit
            if (!this.tagIndexView) return;
        }

        // Add the tag to the index
        await this.tagIndexView.addTag(tagName);
    }

    // Helper to get all tags in the vault
    getAllTags(): string[] {
        const tags = new Set<string>();

        // Get all tags from files
        this.app.vault.getMarkdownFiles().forEach((file) => {
            const fileCache = this.app.metadataCache.getFileCache(file);
            if (fileCache && fileCache.tags) {
                fileCache.tags.forEach((tagCache) => {
                    tags.add(tagCache.tag);
                });
            }
        });

        return Array.from(tags).sort();
    }
}

// Modal for suggesting tags
class TagSuggestModal extends FuzzySuggestModal<string> {
    plugin: TagIndexPlugin;

    constructor(plugin: TagIndexPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.setPlaceholder("Type to search tags");
    }

    getItems(): string[] {
        // Get all tags from the vault
        const allTags = this.plugin.getAllTags();

        // Remove # prefix for display
        return allTags.map((tag) =>
            tag.startsWith("#") ? tag.substring(1) : tag,
        );
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
        this.plugin.addTagToIndex(`#${item}`);
    }

    renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
        const container = el.createDiv({ cls: "suggestion-item" });
        const icon = container.createDiv({ cls: "suggestion-icon" });
        setIcon(icon, "tag");

        container.createDiv({
            cls: "suggestion-content",
            text: match.item,
        });
    }
}
