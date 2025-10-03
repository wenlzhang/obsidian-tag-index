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
    autoInsertParentTags: boolean; // Automatically add parent tags when adding nested tags
}

export const DEFAULT_SETTINGS: TagIndexSettings = {
    importantTags: [],
    addTagsToTop: false,
    debugMode: false,
    autoOpenTagIndexPanel: false,
    autoInsertParentTags: true,
};
