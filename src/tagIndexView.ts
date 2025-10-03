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

interface TreeNode {
    name: string; // Segment name only (e.g., "work", not "project/work")
    fullPath: string; // Full path (e.g., "project/work")
    isActualTag: boolean; // Is this an actual tag in the index, or just a node?
    children: Map<string, TreeNode>;
    tag?: ImportantTag; // The actual tag data if isActualTag is true
}

export class TagIndexView extends ItemView {
    plugin: TagIndexPlugin;
    tagContainer: HTMLElement;
    draggedTag: string | null = null;
    draggedElement: HTMLElement | null = null;
    expandedTags: Set<string> = new Set(); // Track which tags are expanded
    expandedNodes: Set<string> = new Set(); // Track which nodes are expanded

    constructor(leaf: WorkspaceLeaf, plugin: TagIndexPlugin) {
        super(leaf);
        this.plugin = plugin;

        // Load expansion state from settings
        this.expandedTags = new Set(this.plugin.settings.expandedTags || []);
        this.expandedNodes = new Set(this.plugin.settings.expandedNodes || []);
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
        const headerContainer = container.createDiv({
            cls: "tag-index-header",
        });

        // Add a small info icon that can show a tooltip on hover
        const infoIcon = headerContainer.createSpan({
            cls: "tag-index-info-icon",
        });
        setIcon(infoIcon, "info");

        // Use a single title attribute for the tooltip
        infoIcon.setAttribute("title", "Important tags from tag index");

        this.tagContainer = container.createDiv({ cls: "tag-index-container" });

        await this.renderTagsAndRestoreExpansion();
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

        // Build tree structure from all tags
        const tree = this.buildTree();

        // Render the tree
        this.renderTree(tree, this.tagContainer, 0);
    }

    private buildTree(): Map<string, TreeNode> {
        const root = new Map<string, TreeNode>();

        for (const tag of this.plugin.settings.importantTags) {
            const segments = tag.name.split("/");
            let currentLevel = root;
            let currentPath = "";

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                currentPath = currentPath
                    ? `${currentPath}/${segment}`
                    : segment;
                const isLastSegment = i === segments.length - 1;

                if (!currentLevel.has(segment)) {
                    currentLevel.set(segment, {
                        name: segment,
                        fullPath: currentPath,
                        isActualTag: isLastSegment,
                        children: new Map<string, TreeNode>(),
                        tag: isLastSegment ? tag : undefined,
                    });
                } else if (isLastSegment) {
                    // Update existing node to mark it as an actual tag
                    const existingNode = currentLevel.get(segment)!;
                    existingNode.isActualTag = true;
                    existingNode.tag = tag;
                }

                const node = currentLevel.get(segment)!;
                currentLevel = node.children;
            }
        }

        return root;
    }

    private renderTree(
        nodes: Map<string, TreeNode>,
        container: HTMLElement,
        level: number,
    ): void {
        const sortedNodes = Array.from(nodes.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        for (const node of sortedNodes) {
            this.renderNode(node, container, level);
        }
    }

    private renderNode(
        node: TreeNode,
        container: HTMLElement,
        level: number,
    ): void {
        const hasChildren = node.children.size > 0;
        const nodeEl = container.createDiv({
            cls: "tag-index-tree-item",
        });
        nodeEl.setAttribute("data-level", level.toString());
        nodeEl.setAttribute("data-path", node.fullPath);

        // Create the item header
        const headerEl = nodeEl.createDiv({
            cls: "tag-index-tree-item-self",
        });

        // Add chevron if has children or is a tag with notes
        const isExpanded = node.isActualTag
            ? this.expandedTags.has(node.fullPath)
            : this.expandedNodes.has(node.fullPath);

        if (hasChildren || node.isActualTag) {
            const chevron = headerEl.createDiv({
                cls: "tag-index-tree-item-icon",
            });
            setIcon(chevron, isExpanded ? "chevron-down" : "chevron-right");

            chevron.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                this.toggleNode(node);
            });
        } else {
            // Empty space for alignment
            headerEl.createDiv({ cls: "tag-index-tree-item-icon-placeholder" });
        }

        // Add the name (segment only)
        const nameEl = headerEl.createDiv({
            cls: node.isActualTag
                ? "tag-index-tree-item-name tag-index-tree-item-tag"
                : "tag-index-tree-item-name tag-index-tree-item-node",
        });
        nameEl.setText(node.name);

        // If it's an actual tag, add remove button
        if (node.isActualTag && node.tag) {
            const removeBtn = headerEl.createDiv({
                cls: "tag-index-remove-btn",
            });
            setIcon(removeBtn, "x");
            removeBtn.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                this.removeTag(node.fullPath);
            });

            // Make draggable if it's an actual tag
            headerEl.setAttribute("draggable", "true");
            headerEl.addEventListener("dragstart", (e: DragEvent) => {
                this.draggedTag = node.fullPath;
                this.draggedElement = nodeEl;
                nodeEl.addClass("tag-being-dragged");
                if (e.dataTransfer) {
                    e.dataTransfer.setData("text/plain", node.fullPath);
                    e.dataTransfer.effectAllowed = "move";
                }
            });

            headerEl.addEventListener("dragend", () => {
                nodeEl.removeClass("tag-being-dragged");
                this.draggedTag = null;
                this.draggedElement = null;
            });

            nodeEl.addEventListener("dragover", (e: DragEvent) => {
                e.preventDefault();
                if (this.draggedTag && this.draggedTag !== node.fullPath) {
                    nodeEl.addClass("tag-drag-over");
                }
            });

            nodeEl.addEventListener("dragleave", () => {
                nodeEl.removeClass("tag-drag-over");
            });

            nodeEl.addEventListener("drop", (e: DragEvent) => {
                e.preventDefault();
                nodeEl.removeClass("tag-drag-over");
                if (this.draggedTag && this.draggedTag !== node.fullPath) {
                    this.moveTag(this.draggedTag, node.fullPath);
                }
            });
        }

        // Add children container
        const childrenContainer = nodeEl.createDiv({
            cls: "tag-index-tree-item-children",
        });

        if (!isExpanded) {
            childrenContainer.addClass("tag-index-display-none");
        }

        // If this is an actual tag and expanded, show notes
        if (node.isActualTag && isExpanded) {
            const notesContainer = childrenContainer.createDiv({
                cls: "tag-index-tag-notes",
            });
            notesContainer.setAttribute("data-level", level.toString());
            this.populateNotesForTag(node.fullPath, notesContainer);
        }

        // Render children if expanded
        if (hasChildren && isExpanded) {
            this.renderTree(node.children, childrenContainer, level + 1);
        }
    }

    private async toggleNode(node: TreeNode): Promise<void> {
        if (node.isActualTag) {
            if (this.expandedTags.has(node.fullPath)) {
                this.expandedTags.delete(node.fullPath);
            } else {
                this.expandedTags.add(node.fullPath);
            }
        } else {
            if (this.expandedNodes.has(node.fullPath)) {
                this.expandedNodes.delete(node.fullPath);
            } else {
                this.expandedNodes.add(node.fullPath);
            }
        }

        // Save expansion state to settings
        await this.saveExpansionState();

        await this.renderTagsAndRestoreExpansion();
    }

    private async saveExpansionState(): Promise<void> {
        this.plugin.settings.expandedTags = Array.from(this.expandedTags);
        this.plugin.settings.expandedNodes = Array.from(this.expandedNodes);
        await this.plugin.saveSettings();
    }

    async removeTag(tagName: string): Promise<void> {
        this.plugin.settings.importantTags =
            this.plugin.settings.importantTags.filter(
                (t: ImportantTag) => t.name !== tagName,
            );
        await this.plugin.saveSettings();
        await this.renderTagsAndRestoreExpansion();
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
        await this.renderTagsAndRestoreExpansion();
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
                cls: "tag-index-note-preview tag-index-display-none",
            });

            link.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                this.app.workspace.getLeaf().openFile(file);
            });

            // Show preview on hover
            noteItem.addEventListener("mouseenter", async () => {
                // Show loading indicator
                preview.setText("Loading preview...");
                preview.removeClass("tag-index-display-none");
                preview.addClass("tag-index-display-block");

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
                        this.plugin,
                    );
                } catch (error) {
                    preview.setText("Error loading preview");
                }
            });

            noteItem.addEventListener("mouseleave", () => {
                preview.addClass("tag-index-display-none");
                preview.removeClass("tag-index-display-block");
            });
        }
    }

    private async renderTagsAndRestoreExpansion(): Promise<void> {
        const expandedTagsBefore = new Set(this.expandedTags);
        const expandedNodesBefore = new Set(this.expandedNodes);

        this.renderTags();

        this.expandedTags = expandedTagsBefore;
        this.expandedNodes = expandedNodesBefore;
    }

    async addTag(
        tagName: string,
        options?: { isNested?: boolean },
    ): Promise<boolean> {
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
        if (cleanTagName.includes("\n")) {
            const parts = cleanTagName.split("\n");
            cleanTagName = parts[0].trim();
        }
        // Check for the space-number pattern (also common in tag pane)
        else if (cleanTagName.match(/^(.*?)\s+\d+$/)) {
            const spaceNumberMatch = cleanTagName.match(/^(.*?)\s+\d+$/);
            if (spaceNumberMatch) {
                cleanTagName = spaceNumberMatch[1].trim();
            }
        }
        // Check for a numeric suffix that might be a count (least reliable)
        else if (cleanTagName.match(/^(.+?)(\d+)$/)) {
            // Only do this processing if we're confident it's from the tag pane
            // and not just a legitimate tag with numbers
        }

        // Determine whether this tag should be treated as nested
        const shouldTreatAsNested =
            options?.isNested ?? cleanTagName.includes("/");

        // Check if tag already exists
        if (
            this.plugin.settings.importantTags.some(
                (t: ImportantTag) => t.name === cleanTagName,
            )
        ) {
            // Return false to indicate the tag was not added (duplicate)
            return false;
        }

        // Create a new array with a shallow copy of the existing tags
        const importantTags = [...this.plugin.settings.importantTags];

        if (this.plugin.settings.addTagsToTop) {
            // When adding to top, we need to increment all positions first
            for (let i = 0; i < importantTags.length; i++) {
                importantTags[i].position += 1;
            }

            // Then add the new tag at position 0
            const newTag: ImportantTag = {
                name: cleanTagName,
                position: 0,
                isNested: shouldTreatAsNested,
            };

            // Add to the beginning of the array
            importantTags.unshift(newTag);
        } else {
            // When adding to bottom, position is the length of the current array
            const newPosition = importantTags.length;
            const newTag: ImportantTag = {
                name: cleanTagName,
                position: newPosition,
                isNested: shouldTreatAsNested,
            };

            // Add to the end of the array
            importantTags.push(newTag);
        }

        // Update the settings with the modified array
        this.plugin.settings.importantTags = importantTags;

        // Save the updated settings
        await this.plugin.saveSettings();

        // Refresh the view
        await this.renderTagsAndRestoreExpansion();

        // Return true to indicate success
        return true;
    }

    // Sort tags by hierarchy automatically
    async sortTagsByHierarchy(): Promise<void> {
        const tags = [...this.plugin.settings.importantTags];

        // Sort by tag path, ensuring parent tags come before children
        tags.sort((a: ImportantTag, b: ImportantTag) => {
            const aSegments = a.name.split("/");
            const bSegments = b.name.split("/");

            // Compare segment by segment
            for (
                let i = 0;
                i < Math.min(aSegments.length, bSegments.length);
                i++
            ) {
                const comparison = aSegments[i].localeCompare(bSegments[i]);
                if (comparison !== 0) {
                    return comparison;
                }
            }

            // If all segments match, shorter path (parent) comes first
            return aSegments.length - bSegments.length;
        });

        // Update positions
        tags.forEach((tag: ImportantTag, index: number) => {
            tag.position = index;
        });

        this.plugin.settings.importantTags = tags;
        await this.plugin.saveSettings();
        await this.renderTagsAndRestoreExpansion();
    }

    // Deprecated - keeping for backwards compatibility
    async showNotesWithTag(tagName: string): Promise<void> {
        // Expand the tag if it's not already expanded
        if (!this.expandedTags.has(tagName)) {
            this.expandedTags.add(tagName);
            await this.renderTagsAndRestoreExpansion();
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
