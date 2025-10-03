import { App } from "obsidian";

export interface ImportantTag {
    name: string;
    position: number;
    isNested?: boolean; // Whether this tag was added from a hierarchical context
}

export interface TagIndexSettings {
    importantTags: ImportantTag[];
    addTagsToTop: boolean;
    debugMode: boolean;
    autoOpenTagIndexPanel: boolean;
    expandedTags: string[]; // Tags with notes expanded
    expandedNodes: string[]; // Nodes with children expanded
}

export const DEFAULT_SETTINGS: TagIndexSettings = {
    importantTags: [],
    addTagsToTop: false,
    debugMode: false,
    autoOpenTagIndexPanel: false,
    expandedTags: [],
    expandedNodes: [],
};
