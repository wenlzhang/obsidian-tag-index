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
        // This handler function gets the same menu that Tag Wrangler uses
        const handleContextMenu = (event: MouseEvent, target: HTMLElement) => {
            // In the tag pane, the data-tag attribute contains the actual tag name
            const dataTag = target.getAttribute("data-tag");

            // If data-tag is available, use it (this is the clean tag name)
            // Otherwise, try to extract from text content
            let tagName = dataTag;

            // Fallback: try to extract from text content if data-tag is not available
            if (!tagName) {
                const tagText = target.textContent?.trim();
                if (!tagText) return;

                // First, check for a space followed by a number (common tag pane format)
                const spaceNumberMatch = tagText.match(/^(.*?)\s+\d+$/);
                if (spaceNumberMatch) {
                    // If there's a space followed by a number, use the part before
                    tagName = spaceNumberMatch[1].trim();
                } else {
                    // For tags without spaces (like "DVTLCanvas10"),
                    // check for known tag patterns in the vault
                    const withoutNumberPattern = tagText.match(/^([a-zA-Z0-9_\-\/]+?)(\d+)$/);
                    
                    if (withoutNumberPattern) {
                        // Check if this is a valid tag in the vault (without the numbers)
                        const possibleTag = withoutNumberPattern[1];
                        const allTags = this.getAllTags();
                        
                        // If the tag without numbers exists in the vault, use that
                        // Otherwise keep the full name including numbers
                        if (allTags.includes(`#${possibleTag}`)) {
                            tagName = possibleTag;
                        } else {
                            tagName = tagText;
                        }
                    } else {
                        // Default to the full text content if no patterns match
                        tagName = tagText;
                    }
                }
            }

            if (!tagName) return;

            // Get or create a menu for this event
            let menu: Menu;

            // Check if Obsidian's Menu.forEvent is available (newer API)
            if ((Menu as any).forEvent) {
                // Get the menu from the event (which Tag Wrangler would also use)
                menu =
                    (event as any).obsidian_contextmenu ||
                    (Menu as any).forEvent(event);
                (event as any).obsidian_contextmenu = menu;
            } else {
                // For older Obsidian versions, use the event property approach
                menu = (event as any).obsidian_contextmenu;
                if (!menu) {
                    menu = new Menu();
                    (event as any).obsidian_contextmenu = menu;

                    // Show the menu after a brief delay (allows other plugins to add their items)
                    setTimeout(() => {
                        menu.showAtPosition({ x: event.pageX, y: event.pageY });
                    }, 0);
                }
            }

            // Add our item to the menu
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
        };

        // Create a context menu handler function
        const contextMenuHandler = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target && target.closest && target.closest(".tag-pane-tag")) {
                handleContextMenu(
                    event,
                    target.closest(".tag-pane-tag") as HTMLElement,
                );
            }
        };

        // Add event listener with capture phase (true)
        document.addEventListener("contextmenu", contextMenuHandler, true);

        // Register a function to remove the event listener when the plugin is disabled
        this.register(() => {
            document.removeEventListener(
                "contextmenu",
                contextMenuHandler,
                true,
            );
        });
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
        
        // Log the loaded settings for debugging
        console.log("Loaded settings:", JSON.stringify(this.settings));
    }

    async saveSettings() {
        console.log("Saving settings:", JSON.stringify(this.settings));
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
