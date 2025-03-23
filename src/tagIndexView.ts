import {
    ItemView,
    WorkspaceLeaf,
    Menu,
    TFile,
    setIcon,
    MarkdownRenderer,
    App,
    TagCache,
    Notice,
} from "obsidian";
import type TagIndexPlugin from "./main";
import { ImportantTag } from "./settings";

export const TAG_INDEX_VIEW_TYPE = "tag-index-view";

export class TagIndexView extends ItemView {
    plugin: TagIndexPlugin;
    tagContainer: HTMLElement;
    draggedTag: string | null = null;
    draggedElement: HTMLElement | null = null;
    expandedTags: Set<string> = new Set(); // Track which tags are expanded

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
        return "hash";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();

        // Create a minimal header with an icon instead of the text heading
        const headerContainer = container.createDiv({ cls: "tag-index-header" });
        
        // Add a small info icon that can show a tooltip on hover
        const infoIcon = headerContainer.createSpan({ cls: "tag-index-info-icon" });
        setIcon(infoIcon, "info");
        
        // Use a single title attribute for the tooltip
        infoIcon.setAttribute("title", "Important tags from Tag Index");
        
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

        // Determine if this tag is expanded
        const isExpanded = this.expandedTags.has(tag.name);
        if (isExpanded) {
            tagEl.addClass("tag-expanded");
        }

        // Tag header container (single row with all controls)
        const tagHeader = tagEl.createDiv({ cls: "tag-index-tag-header" });

        // Create expand/collapse icon
        const collapseIcon = tagHeader.createDiv({
            cls: "tag-index-collapse-icon",
        });
        setIcon(collapseIcon, isExpanded ? "chevron-down" : "chevron-right");

        // Tag name in the center (removed the redundant tag icon)
        const tagNameContainer = tagHeader.createDiv({
            cls: "tag-index-tag-name",
        });
        tagNameContainer.createSpan().setText(tag.name);

        // Remove button on the right
        const removeButton = tagHeader.createDiv({
            cls: "tag-index-remove-btn",
        });
        setIcon(removeButton, "x");
        removeButton.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            this.removeTag(tag.name);
        });

        // Create container for notes (initially hidden if not expanded)
        const notesContainer = tagEl.createDiv({
            cls: "tag-index-tag-notes",
        });
        notesContainer.style.display = isExpanded ? "block" : "none";

        // If the tag is expanded, populate the notes
        if (isExpanded) {
            this.populateNotesForTag(tag.name, notesContainer);
        }

        // Click to expand/collapse tag
        tagHeader.addEventListener("click", () => {
            this.toggleTag(tag.name, tagEl, collapseIcon, notesContainer);
        });

        // Make tag draggable
        tagHeader.setAttribute("draggable", "true");

        tagHeader.addEventListener("dragstart", (e: DragEvent) => {
            this.draggedTag = tag.name;
            this.draggedElement = tagEl;
            tagEl.addClass("tag-being-dragged");
            if (e.dataTransfer) {
                e.dataTransfer.setData("text/plain", tag.name);
                e.dataTransfer.effectAllowed = "move";
            }
        });

        tagHeader.addEventListener("dragend", () => {
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

    // Toggle tag expansion
    async toggleTag(
        tagName: string,
        tagEl: HTMLElement,
        collapseIcon: HTMLElement,
        notesContainer: HTMLElement,
    ): Promise<void> {
        const isExpanded = this.expandedTags.has(tagName);

        if (isExpanded) {
            // Collapse
            this.expandedTags.delete(tagName);
            notesContainer.style.display = "none";
            tagEl.removeClass("tag-expanded");
            setIcon(collapseIcon, "chevron-right");
        } else {
            // Expand
            this.expandedTags.add(tagName);
            tagEl.addClass("tag-expanded");
            setIcon(collapseIcon, "chevron-down");

            // Show loading indicator
            notesContainer.empty();
            notesContainer
                .createDiv({ cls: "tag-index-loading" })
                .setText("Loading notes...");
            notesContainer.style.display = "block";

            // Populate notes
            await this.populateNotesForTag(tagName, notesContainer);
        }
    }

    // Populate notes for a tag
    async populateNotesForTag(
        tagName: string,
        container: HTMLElement,
    ): Promise<void> {
        container.empty();

        // Get the clean tag name without any hash
        const tagNameWithoutHash = tagName.startsWith("#")
            ? tagName.substring(1)
            : tagName;

        // Log for debugging
        console.log("Searching for notes with tag:", tagNameWithoutHash);

        // Find files with the tag by searching the metadata cache
        const filesWithTag = this.app.vault
            .getMarkdownFiles()
            .filter((file: TFile) => {
                const cache = this.app.metadataCache.getFileCache(file);
                if (!cache) return false;

                // Check both inline tags and frontmatter tags

                // 1. Check inline tags in content (stored with # prefix in cache.tags)
                if (cache.tags) {
                    const hasInlineTag = cache.tags.some((tagCache) => {
                        // Tags in content are stored with # prefix
                        return tagCache.tag === `#${tagNameWithoutHash}`;
                    });

                    if (hasInlineTag) return true;
                }

                // 2. Check frontmatter tags (stored in cache.frontmatter.tags)
                if (cache.frontmatter && cache.frontmatter.tags) {
                    // Frontmatter tags can be a string or an array
                    const frontmatterTags = cache.frontmatter.tags;

                    if (Array.isArray(frontmatterTags)) {
                        // If it's an array of tags
                        return frontmatterTags.some(
                            (tag) =>
                                // In frontmatter, tags are stored without # prefix
                                tag === tagNameWithoutHash,
                        );
                    } else if (typeof frontmatterTags === "string") {
                        // If it's a comma-separated string
                        return frontmatterTags
                            .split(",")
                            .map((t) => t.trim())
                            .includes(tagNameWithoutHash);
                    }
                }

                return false;
            });

        // Debug log the results
        console.log(
            `Found ${filesWithTag.length} files with tag ${tagNameWithoutHash}`,
        );

        if (filesWithTag.length === 0) {
            container
                .createDiv({ cls: "tag-index-empty-note" })
                .setText("No notes found with this tag");
            return;
        }

        // List files
        const notesList = container.createDiv({ cls: "tag-index-notes-list" });
        for (const file of filesWithTag) {
            const noteItem = notesList.createDiv({
                cls: "tag-index-note-item",
            });

            // File link (no icon)
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
                        this as any,
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

    async addTag(tagName: string): Promise<boolean> {
        // Store the tag name consistently without the # prefix
        let cleanTagName = tagName;

        // Remove # if present
        if (cleanTagName.startsWith("#")) {
            cleanTagName = cleanTagName.substring(1);
        }

        // Trim any whitespace
        cleanTagName = cleanTagName.trim();
        
        // SPECIAL HANDLING FOR OBSIDIAN TAG PANE
        // We assume most of the work is done in the context menu handler
        // But add a fallback to handle any tags that might have slipped through
        
        // Check if we have a linebreak (Obsidian's tag pane format)
        if (cleanTagName.includes('\n')) {
            const parts = cleanTagName.split('\n');
            cleanTagName = parts[0].trim();
            console.log("Tag panel detected linebreak pattern, cleaned to:", cleanTagName);
        }
        // Check for the space-number pattern (also common in tag pane)
        else if (cleanTagName.match(/^(.*?)\s+\d+$/)) {
            const spaceNumberMatch = cleanTagName.match(/^(.*?)\s+\d+$/);
            if (spaceNumberMatch) {
                cleanTagName = spaceNumberMatch[1].trim();
                console.log("Tag panel detected space-number pattern, cleaned to:", cleanTagName);
            }
        }
        // Check for a numeric suffix that might be a count (least reliable)
        else if (cleanTagName.match(/^(.+?)(\d+)$/)) {
            // Only do this processing if we're confident it's from the tag pane
            // and not just a legitimate tag with numbers
            console.log("Potential tag with count detected, but leaving as is since we already processed in main.ts");
        }

        console.log("Adding tag to index:", cleanTagName);
        console.log("Current addTagsToTop setting:", this.plugin.settings.addTagsToTop);

        // Check if tag already exists
        if (
            this.plugin.settings.importantTags.some(
                (t: ImportantTag) => t.name === cleanTagName,
            )
        ) {
            console.log("Tag already exists, not adding:", cleanTagName);
            // Return false to indicate the tag was not added (duplicate)
            return false;
        }

        // Create a new array with a shallow copy of the existing tags
        const importantTags = [...this.plugin.settings.importantTags];

        if (this.plugin.settings.addTagsToTop) {
            console.log("Adding tag to top:", cleanTagName);

            // When adding to top, we need to increment all positions first
            for (let i = 0; i < importantTags.length; i++) {
                importantTags[i].position += 1;
            }

            // Then add the new tag at position 0
            const newTag = {
                name: cleanTagName,
                position: 0,
            };

            // Add to the beginning of the array
            importantTags.unshift(newTag);
        } else {
            console.log("Adding tag to bottom:", cleanTagName);

            // When adding to bottom, position is the length of the current array
            const newPosition = importantTags.length;
            const newTag = {
                name: cleanTagName,
                position: newPosition,
            };

            // Add to the end of the array
            importantTags.push(newTag);
        }

        // Update the settings with the modified array
        this.plugin.settings.importantTags = importantTags;

        // Log current tags after modification
        console.log("Tags after adding:", JSON.stringify(this.plugin.settings.importantTags));

        // Save the updated settings
        await this.plugin.saveSettings();

        // Refresh the view
        this.renderTags();
        
        // Return true to indicate success
        return true;
    }

    // Deprecated - keeping for backwards compatibility
    async showNotesWithTag(tagName: string): Promise<void> {
        // Find the tag element
        const tagEl = this.tagContainer.querySelector(
            `[data-tag="${tagName}"]`,
        );
        if (tagEl) {
            // Get the collapse icon and notes container
            const collapseIcon = tagEl.querySelector(
                ".tag-index-collapse-icon",
            );
            const notesContainer = tagEl.querySelector(".tag-index-tag-notes");

            if (collapseIcon && notesContainer) {
                // Expand the tag if it's not already expanded
                if (!this.expandedTags.has(tagName)) {
                    this.toggleTag(
                        tagName,
                        tagEl as HTMLElement,
                        collapseIcon as HTMLElement,
                        notesContainer as HTMLElement,
                    );
                }
            }
        }
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
