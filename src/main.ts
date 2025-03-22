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
} from "obsidian";
import { TagIndexSettings, DEFAULT_SETTINGS, ImportantTag } from "./settings";
import { TagIndexView, TAG_INDEX_VIEW_TYPE } from "./tagIndexView";
import { TagIndexSettingTab } from "./settingsTab";
import "./styles.css";

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
            // @ts-ignore - Obsidian typings are incomplete here
            this.app.workspace.on(
                "editor-menu",
                (menu: Menu, editor: Editor, view: MarkdownView) => {
                    // Get the text under the cursor
                    const cursor = editor.getCursor();
                    const line = editor.getLine(cursor.line);

                    // Check if there's a tag at the cursor position
                    const tagMatch = /#[\w\/-]+/.exec(
                        line.slice(cursor.ch - 20, cursor.ch + 20),
                    );
                    if (!tagMatch) return;

                    menu.addItem((item: MenuItem) => {
                        item.setTitle("Add to Tag Index")
                            .setIcon("plus")
                            .onClick(() => {
                                this.addTagToIndex(tagMatch[0]);
                            });
                    });
                },
            ),
        );

        // Add context menu item to tags in tag pane
        this.registerEvent(
            // @ts-ignore - Obsidian typings are incomplete here
            this.app.workspace.on(
                "file-menu",
                (menu: Menu, file: TFile, source: string) => {
                    // Check if it's from the tag pane
                    if (source !== "tag-pane") return;

                    // Add the menu item
                    menu.addItem((item: MenuItem) => {
                        item.setTitle("Add to Tag Index")
                            .setIcon("plus")
                            .onClick(() => {
                                // Get the tag name from the context
                                if (file && typeof file === "string") {
                                    this.addTagToIndex(file);
                                }
                            });
                    });
                },
            ),
        );

        // Try to activate view after plugin is loaded
        this.app.workspace.onLayoutReady(() => {
            this.activateView();
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
