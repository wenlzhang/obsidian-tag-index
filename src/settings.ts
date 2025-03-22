import { App } from "obsidian";

export interface ImportantTag {
    name: string;
    position: number;
}

export interface TagIndexSettings {
    importantTags: ImportantTag[];
}

export const DEFAULT_SETTINGS: TagIndexSettings = {
    importantTags: [],
};
