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
    MarkdownView,
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
    draggedNode: TreeNode | null = null;
    expandedTags: Set<string> = new Set(); // Track which tags are expanded
    expandedNodes: Set<string> = new Set(); // Track which nodes are expanded
    private metadataChangeHandler: (file: TFile) => void;

    constructor(leaf: WorkspaceLeaf, plugin: TagIndexPlugin) {
        super(leaf);
        this.plugin = plugin;

        // Load expansion state from settings
        this.expandedTags = new Set(this.plugin.settings.expandedTags || []);
        this.expandedNodes = new Set(this.plugin.settings.expandedNodes || []);

        // Set up auto-refresh on file changes
        this.metadataChangeHandler = (file: TFile) => {
            this.onFileMetadataChange(file);
        };
        this.registerEvent(
            this.app.metadataCache.on("changed", this.metadataChangeHandler),
        );
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
        // Clean up the refresh timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
    }

    private onFileMetadataChange(file: TFile): void {
        // Only refresh if line content is enabled and we have expanded tags
        if (
            !this.plugin.settings.showLineContent ||
            this.expandedTags.size === 0
        ) {
            return;
        }

        // Check if the file contains any of our important tags
        const fileHasImportantTag = this.fileContainsImportantTags(file);

        if (!fileHasImportantTag) {
            // File doesn't contain any important tags, skip refresh
            return;
        }

        // Debounce the refresh to avoid too many updates
        this.debouncedRefresh();
    }

    // Helper method to check if a file contains any important tags
    private fileContainsImportantTags(file: TFile): boolean {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return false;

        // Get all important tag names without # prefix as a Set for O(1) lookup
        const importantTagNames = new Set(
            this.plugin.settings.importantTags.map((tag) =>
                tag.name.startsWith("#") ? tag.name.substring(1) : tag.name,
            ),
        );

        // Check inline tags
        if (cache.tags) {
            for (const tagCache of cache.tags) {
                const tagName = tagCache.tag.startsWith("#")
                    ? tagCache.tag.substring(1)
                    : tagCache.tag;

                if (importantTagNames.has(tagName)) {
                    return true;
                }
            }
        }

        // Check frontmatter tags
        if (cache.frontmatter && cache.frontmatter.tags) {
            const frontmatterTags = cache.frontmatter.tags;

            if (Array.isArray(frontmatterTags)) {
                for (const tag of frontmatterTags) {
                    if (importantTagNames.has(tag)) {
                        return true;
                    }
                }
            } else if (typeof frontmatterTags === "string") {
                const tags = frontmatterTags.split(",").map((t) => t.trim());
                for (const tag of tags) {
                    if (importantTagNames.has(tag)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private refreshTimeout: NodeJS.Timeout | null = null;
    private debouncedRefresh(): void {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        // Use the configurable refresh delay from settings
        this.refreshTimeout = setTimeout(() => {
            this.renderTagsAndRestoreExpansion();
        }, this.plugin.settings.refreshDelay);
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
                    const existingNode = currentLevel.get(segment);
                    if (existingNode) {
                        existingNode.isActualTag = true;
                        existingNode.tag = tag;
                    }
                }

                const node = currentLevel.get(segment);
                if (node) {
                    currentLevel = node.children;
                }
            }
        }

        return root;
    }

    // Helper method to get effective position for sorting
    // For actual tags, returns their position
    // For intermediate nodes, returns the minimum position of all descendant tags
    private getEffectivePosition(node: TreeNode): number {
        if (node.isActualTag && node.tag) {
            return node.tag.position;
        }

        // For intermediate nodes, find minimum position among descendants
        let minPosition = Infinity;
        const findMinPosition = (n: TreeNode): void => {
            if (n.isActualTag && n.tag) {
                minPosition = Math.min(minPosition, n.tag.position);
            }
            n.children.forEach((child) => findMinPosition(child));
        };

        findMinPosition(node);
        return minPosition === Infinity ? 0 : minPosition;
    }

    private renderTree(
        nodes: Map<string, TreeNode>,
        container: HTMLElement,
        level: number,
    ): void {
        const sortedNodes = Array.from(nodes.values()).sort((a, b) => {
            const posA = this.getEffectivePosition(a);
            const posB = this.getEffectivePosition(b);

            // Sort by position
            if (posA !== posB) {
                return posA - posB;
            }

            // If positions are equal (shouldn't happen for well-formed data),
            // fall back to alphabetical sorting
            return a.name.localeCompare(b.name);
        });

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
        }

        // Make all nodes draggable (both actual tags and intermediate nodes)
        headerEl.setAttribute("draggable", "true");
        headerEl.addEventListener("dragstart", (e: DragEvent) => {
            this.draggedTag = node.fullPath;
            this.draggedNode = node;
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
            this.draggedNode = null;
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
            if (
                this.draggedTag &&
                this.draggedTag !== node.fullPath &&
                this.draggedNode
            ) {
                this.moveNodeOrTag(this.draggedNode, node);
            }
        });

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

    // Helper method to collect all descendant tags from a node
    private collectDescendantTags(node: TreeNode): ImportantTag[] {
        const descendants: ImportantTag[] = [];

        if (node.isActualTag && node.tag) {
            descendants.push(node.tag);
        }

        node.children.forEach((child) => {
            descendants.push(...this.collectDescendantTags(child));
        });

        return descendants;
    }

    async moveNodeOrTag(
        sourceNode: TreeNode,
        targetNode: TreeNode,
    ): Promise<void> {
        // Collect all descendant tags from the source node
        const descendantTags = this.collectDescendantTags(sourceNode);

        if (descendantTags.length === 0) {
            // No actual tags to move
            return;
        }

        // Get all tags and create a working copy
        const tags = this.plugin.settings.importantTags.map((tag) => ({
            ...tag,
        }));

        // Find the target position
        let targetPosition: number;
        if (targetNode.isActualTag && targetNode.tag) {
            targetPosition = targetNode.tag.position;
        } else {
            // For intermediate nodes, use the effective position
            const targetDescendants = this.collectDescendantTags(targetNode);
            if (targetDescendants.length > 0) {
                targetPosition = Math.min(
                    ...targetDescendants.map((t) => t.position),
                );
            } else {
                return;
            }
        }

        // Calculate the minimum position of source tags
        const sourceMinPosition = Math.min(
            ...descendantTags.map((t) => t.position),
        );

        // Determine if we're moving down or up
        const isMovingDown = sourceMinPosition < targetPosition;

        // Sort descendant tags by their current position to preserve relative order
        const sortedDescendants = descendantTags.sort(
            (a, b) => a.position - b.position,
        );

        // Assign new positions to the descendant tags
        // We'll use fractional positions and then normalize
        const basePosition = isMovingDown
            ? targetPosition + 0.5
            : targetPosition - 0.5;

        sortedDescendants.forEach((descendant, index) => {
            const tagIndex = tags.findIndex((t) => t.name === descendant.name);
            if (tagIndex !== -1) {
                // Assign positions with small increments to maintain order
                tags[tagIndex].position = basePosition + index * 0.01;
            }
        });

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

    // Helper method to extract line content containing a tag from a file
    private async getTagLineContent(
        file: TFile,
        tagName: string,
    ): Promise<{ line: number; content: string }[]> {
        const tagNameWithoutHash = tagName.startsWith("#")
            ? tagName.substring(1)
            : tagName;

        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return [];

        const results: { line: number; content: string }[] = [];

        // Get file content
        const fileContent = await this.app.vault.read(file);
        const lines = fileContent.split("\n");

        // Check inline tags from cache
        if (cache.tags) {
            cache.tags.forEach((tagCache) => {
                if (tagCache.tag === `#${tagNameWithoutHash}`) {
                    const lineNumber = tagCache.position.start.line;
                    if (lineNumber < lines.length) {
                        results.push({
                            line: lineNumber,
                            content: lines[lineNumber].trim(),
                        });
                    }
                }
            });
        }

        // Remove duplicates (in case the same line appears multiple times)
        const uniqueResults = results.filter(
            (item, index, self) =>
                index === self.findIndex((t) => t.line === item.line),
        );

        // Sort by line number
        return uniqueResults.sort((a, b) => a.line - b.line);
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

            // Create header container for the file link
            const noteHeader = noteItem.createDiv({
                cls: "tag-index-note-header",
            });

            // Create internal link using Obsidian's native format
            // This enables hover preview with Page Preview core plugin or Hover Editor
            const link = noteHeader.createEl("a", {
                text: file.basename,
                cls: "tag-index-note-link internal-link",
            });

            // Set the data-href attribute for Obsidian's hover preview system
            link.setAttribute("data-href", file.path);
            link.setAttribute("href", file.path);
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener");

            // Handle click to open the file
            link.addEventListener("click", (e: MouseEvent) => {
                e.preventDefault();
                this.app.workspace.getLeaf().openFile(file);
            });

            // Enable Obsidian's native hover preview
            // This works with both the core Page Preview plugin and third-party plugins like Hover Editor
            link.addEventListener("mouseover", (event: MouseEvent) => {
                this.app.workspace.trigger("hover-link", {
                    event,
                    source: TAG_INDEX_VIEW_TYPE,
                    hoverParent: this,
                    targetEl: link,
                    linktext: file.path,
                });
            });

            // Show line content if the setting is enabled
            if (this.plugin.settings.showLineContent) {
                const tagLineContent = await this.getTagLineContent(
                    file,
                    tagName,
                );

                if (tagLineContent.length > 0) {
                    const linesContainer = noteItem.createDiv({
                        cls: "tag-index-line-content-container",
                    });

                    for (const item of tagLineContent) {
                        const lineEl = linesContainer.createDiv({
                            cls: "tag-index-line-content tag-index-line-clickable",
                        });

                        // Add click handler for line content
                        lineEl.addEventListener(
                            "click",
                            async (e: MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await this.handleLineContentClick(
                                    file,
                                    item.line,
                                    tagName,
                                );
                            },
                        );

                        // Add line number
                        const lineNumber = lineEl.createSpan({
                            cls: "tag-index-line-number",
                            text: `${item.line + 1}: `,
                        });

                        // Add line content using MarkdownRenderer for proper formatting
                        const contentEl = lineEl.createSpan({
                            cls: "tag-index-line-text",
                        });
                        await MarkdownRenderer.renderMarkdown(
                            item.content,
                            contentEl,
                            file.path,
                            this,
                        );
                    }
                }
            }
        }
    }

    // Handle click on line content
    private async handleLineContentClick(
        file: TFile,
        lineNumber: number,
        tagName: string,
    ): Promise<void> {
        const behavior = this.plugin.settings.lineContentClickBehavior;
        const cursorPos = this.plugin.settings.cursorPosition;

        // Open the file and jump to the line
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);

        // Get the editor from the markdown view
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.editor) {
            return;
        }

        const editor = view.editor;

        // Calculate cursor position on the line
        const line = editor.getLine(lineNumber);
        const column = cursorPos === "end" ? line.length : 0;

        // Set cursor position
        editor.setCursor({
            line: lineNumber,
            ch: column,
        });

        // Scroll to the line
        editor.scrollIntoView(
            {
                from: { line: lineNumber, ch: 0 },
                to: { line: lineNumber, ch: line.length },
            },
            true,
        );

        // If the behavior is to also search, trigger the search
        if (behavior === "jumpAndSearch") {
            // Use Obsidian's search functionality
            const searchLeaf = this.app.workspace.getLeavesOfType("search")[0];

            if (searchLeaf) {
                // Get the search view
                const searchView = searchLeaf.view as any;

                // Set the search query to the tag
                if (searchView && searchView.setQuery) {
                    searchView.setQuery(
                        `tag:${tagName.startsWith("#") ? tagName.substring(1) : tagName}`,
                    );
                }

                // Reveal the search pane
                this.app.workspace.revealLeaf(searchLeaf);
            } else {
                // If search pane doesn't exist, execute the global search command
                (this.app as any).commands.executeCommandById(
                    "global-search:open",
                );

                // Wait a bit for the search pane to open
                setTimeout(() => {
                    const newSearchLeaf =
                        this.app.workspace.getLeavesOfType("search")[0];
                    if (newSearchLeaf) {
                        const searchView = newSearchLeaf.view as any;
                        if (searchView && searchView.setQuery) {
                            searchView.setQuery(
                                `tag:${tagName.startsWith("#") ? tagName.substring(1) : tagName}`,
                            );
                        }
                    }
                }, 100);
            }
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

        // Create a deep copy of the existing tags to avoid modifying original objects
        const importantTags = this.plugin.settings.importantTags.map((tag) => ({
            ...tag,
        }));

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
