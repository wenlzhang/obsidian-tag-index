import { App } from "obsidian";

export interface ImportantTag {
    name: string;
    position: number;
    isNested?: boolean; // Whether this tag was added from a hierarchical context
}

export type NoteSortMethod =
    | "file-name-asc"
    | "file-name-desc"
    | "modified-new"
    | "modified-old"
    | "created-new"
    | "created-old";

export interface TagIndexSettings {
    importantTags: ImportantTag[];
    addTagsToTop: boolean;
    debugMode: boolean;
    autoOpenTagIndexPanel: boolean;
    expandedTags: string[]; // Tags with notes expanded
    expandedNodes: string[]; // Nodes with children expanded
    showLineContent: boolean; // Show line/block content where tags appear
    lineContentClickBehavior: "jumpToLine" | "jumpAndSearch"; // What happens when clicking line content
    cursorPosition: "start" | "end"; // Where to place cursor when jumping to line
    refreshDelay: number; // Delay in milliseconds before refreshing after file changes (0-3600000ms = 0-60min)
    noteSortMethod: NoteSortMethod; // How to sort notes under tags
}

export const DEFAULT_SETTINGS: TagIndexSettings = {
    importantTags: [],
    addTagsToTop: false,
    debugMode: false,
    autoOpenTagIndexPanel: false,
    expandedTags: [],
    expandedNodes: [],
    showLineContent: true,
    lineContentClickBehavior: "jumpToLine",
    cursorPosition: "end",
    refreshDelay: 500,
    noteSortMethod: "modified-new",
};
