import {
    ItemView,
    WorkspaceLeaf,
    Menu,
    TFile,
    setIcon,
    MarkdownRenderer,
    App,
    TagCache,
} from "obsidian";
import type TagIndexPlugin from "./main";
import { ImportantTag } from "./settings";

export const TAG_INDEX_VIEW_TYPE = "tag-index-view";

export class TagIndexView extends ItemView {
    plugin: TagIndexPlugin;
    tagContainer: HTMLElement;
    draggedTag: string | null = null;
    draggedElement: HTMLElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: TagIndexPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return TAG_INDEX_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Tag Index";
    }

    getIcon(): string {
        return "tag";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();

        container.createEl("h4", { text: "Important tags" });

        this.tagContainer = container.createDiv({ cls: "tag-index-container" });

        this.renderTags();
    }

    async onClose(): Promise<void> {
        // Nothing to clean up
    }

    renderTags(): void {
        this.tagContainer.empty();

        if (this.plugin.settings.importantTags.length === 0) {
            const emptyState = this.tagContainer.createDiv({
                cls: "tag-index-empty-state",
            });
            emptyState.setText("No important tags added yet");
            return;
        }

        // Sort tags by position
        const sortedTags = [...this.plugin.settings.importantTags].sort(
            (a: ImportantTag, b: ImportantTag) => a.position - b.position,
        );

        for (const tag of sortedTags) {
            this.createTagElement(tag);
        }
    }

    createTagElement(tag: ImportantTag): void {
        const tagEl = this.tagContainer.createDiv({ cls: "tag-index-tag" });
        tagEl.setAttribute("data-tag", tag.name);

        // Tag icon and name
        const tagNameContainer = tagEl.createDiv({ cls: "tag-index-tag-name" });
        setIcon(tagNameContainer.createSpan({ cls: "tag-index-icon" }), "tag");
        tagNameContainer.createSpan().setText(tag.name);

        // Remove button
        const removeButton = tagEl.createDiv({ cls: "tag-index-remove-btn" });
        setIcon(removeButton, "x");
        removeButton.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            this.removeTag(tag.name);
        });

        // Click to show notes with this tag
        tagEl.addEventListener("click", () => {
            this.showNotesWithTag(tag.name);
        });

        // Make tag draggable
        tagEl.setAttribute("draggable", "true");

        tagEl.addEventListener("dragstart", (e: DragEvent) => {
            this.draggedTag = tag.name;
            this.draggedElement = tagEl;
            tagEl.addClass("tag-being-dragged");
            if (e.dataTransfer) {
                e.dataTransfer.setData("text/plain", tag.name);
                e.dataTransfer.effectAllowed = "move";
            }
        });

        tagEl.addEventListener("dragend", () => {
            tagEl.removeClass("tag-being-dragged");
            this.draggedTag = null;
            this.draggedElement = null;
        });

        tagEl.addEventListener("dragover", (e: DragEvent) => {
            e.preventDefault();
            if (this.draggedTag && this.draggedTag !== tag.name) {
                tagEl.addClass("tag-drag-over");
            }
        });

        tagEl.addEventListener("dragleave", () => {
            tagEl.removeClass("tag-drag-over");
        });

        tagEl.addEventListener("drop", (e: DragEvent) => {
            e.preventDefault();
            tagEl.removeClass("tag-drag-over");
            if (this.draggedTag && this.draggedTag !== tag.name) {
                this.moveTag(this.draggedTag, tag.name);
            }
        });
    }

    async removeTag(tagName: string): Promise<void> {
        this.plugin.settings.importantTags =
            this.plugin.settings.importantTags.filter(
                (t: ImportantTag) => t.name !== tagName,
            );
        await this.plugin.saveSettings();
        this.renderTags();
    }

    async moveTag(sourceTagName: string, targetTagName: string): Promise<void> {
        const tags = [...this.plugin.settings.importantTags];
        const sourceIndex = tags.findIndex(
            (t: ImportantTag) => t.name === sourceTagName,
        );
        const targetIndex = tags.findIndex(
            (t: ImportantTag) => t.name === targetTagName,
        );

        if (sourceIndex === -1 || targetIndex === -1) return;

        const sourceTag = tags[sourceIndex];
        const targetTag = tags[targetIndex];

        // Move source tag to position just before or after the target tag
        const isMovingDown = sourceIndex < targetIndex;
        const newPosition = isMovingDown
            ? targetTag.position + 0.5
            : targetTag.position - 0.5;
        sourceTag.position = newPosition;

        // Normalize positions to ensure they are consecutive integers
        const normalizedTags = tags
            .sort((a: ImportantTag, b: ImportantTag) => a.position - b.position)
            .map((tag: ImportantTag, index: number) => ({
                ...tag,
                position: index,
            }));

        this.plugin.settings.importantTags = normalizedTags;
        await this.plugin.saveSettings();
        this.renderTags();
    }

    async showNotesWithTag(tagName: string): Promise<void> {
        // Clear previous results
        const notesContainer =
            this.containerEl.querySelector(".tag-index-notes");
        if (notesContainer) notesContainer.remove();

        // Create notes container
        const notes = this.containerEl.createDiv({ cls: "tag-index-notes" });
        notes.createEl("h5", { text: `Notes with tag ${tagName}` });

        // Find files with the tag
        const filesWithTag = this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (!cache || !cache.tags) return false;

                // Check if the tag matches
                const tagWithHash = tagName.startsWith("#")
                    ? tagName
                    : `#${tagName}`;
                return cache.tags.some(
                    (tagCache: TagCache) => tagCache.tag === tagWithHash,
                );
            });

        if (filesWithTag.length === 0) {
            notes
                .createDiv({ cls: "tag-index-empty-note" })
                .setText("No notes found with this tag");
            return;
        }

        // List files
        const notesList = notes.createDiv({ cls: "tag-index-notes-list" });
        for (const file of filesWithTag) {
            const noteItem = notesList.createDiv({
                cls: "tag-index-note-item",
            });
            const link = noteItem.createEl("a", {
                text: file.basename,
                cls: "tag-index-note-link",
            });

            // Create and position the hover preview
            const preview = noteItem.createDiv({
                cls: "tag-index-note-preview",
            });
            preview.style.display = "none";

            link.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                this.app.workspace.getLeaf().openFile(file);
            });

            // Show preview on hover
            noteItem.addEventListener("mouseenter", async () => {
                // Show loading indicator
                preview.setText("Loading preview...");
                preview.style.display = "block";

                // Get file content
                try {
                    const content = await this.app.vault.read(file);
                    const previewContent =
                        content.slice(0, 500) +
                        (content.length > 500 ? "..." : "");

                    preview.empty();
                    await MarkdownRenderer.renderMarkdown(
                        previewContent,
                        preview,
                        file.path,
                        this,
                    );
                } catch (error) {
                    preview.setText("Error loading preview");
                }
            });

            noteItem.addEventListener("mouseleave", () => {
                preview.style.display = "none";
            });
        }
    }

    async addTag(tagName: string): Promise<void> {
        // Remove # if present
        if (tagName.startsWith("#")) {
            tagName = tagName.substring(1);
        }

        // Check if tag already exists
        if (
            this.plugin.settings.importantTags.some(
                (t: ImportantTag) => t.name === tagName,
            )
        ) {
            return;
        }

        // Add tag with position at the end
        const newPosition = this.plugin.settings.importantTags.length;
        this.plugin.settings.importantTags.push({
            name: tagName,
            position: newPosition,
        });

        await this.plugin.saveSettings();
        this.renderTags();
    }

    onMenu(menu: Menu): void {
        // Add menu items here
    }

    onResize(): void {
        // Handle resize event
    }

    onLayoutResize(): void {
        // Handle layout resize event
    }
}
