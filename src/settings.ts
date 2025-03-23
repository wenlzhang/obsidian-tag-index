import { App } from "obsidian";

export interface ImportantTag {
    name: string;
    position: number;
}

export interface TagIndexSettings {
    importantTags: ImportantTag[];
    addTagsToTop: boolean;
}

export const DEFAULT_SETTINGS: TagIndexSettings = {
    importantTags: [],
    addTagsToTop: false,
};
