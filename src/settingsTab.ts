import { App, PluginSettingTab, Setting } from "obsidian";
import type TagIndexPlugin from "./main";

export class TagIndexSettingTab extends PluginSettingTab {
    plugin: TagIndexPlugin;

    constructor(app: App, plugin: TagIndexPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Add new tags to top")
            .setDesc(
                "When enabled, new tags will be added to the top of the tag list; otherwise, they will be added to the bottom.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.addTagsToTop)
                    .onChange(async (value) => {
                        this.plugin.settings.addTagsToTop = value;
                        await this.plugin.saveSettings();
                        if (this.plugin.tagIndexView) {
                            this.plugin.tagIndexView.renderTags();
                        }
                    }),
            );

        new Setting(containerEl)
            .setName("Auto-open tag index panel")
            .setDesc(
                "When enabled, the tag index side panel will automatically open when Obsidian starts or when the plugin is enabled.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoOpenTagIndexPanel)
                    .onChange(async (value) => {
                        this.plugin.settings.autoOpenTagIndexPanel = value;
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName("Show line content")
            .setDesc(
                "When enabled, displays the line or block content where each tag appears in the file. Multiple lines with the same tag will all be shown.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showLineContent)
                    .onChange(async (value) => {
                        this.plugin.settings.showLineContent = value;
                        await this.plugin.saveSettings();
                        if (this.plugin.tagIndexView) {
                            this.plugin.tagIndexView.renderTags();
                        }
                    }),
            );

        // Add a heading for Advanced settings
        new Setting(containerEl).setName("Advanced").setHeading();

        // Add debug mode toggle under advanced section
        new Setting(containerEl)
            .setName("Debug mode")
            .setDesc(
                "Enable console logging for debugging purposes. Only enable this if you need to troubleshoot issues.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.debugMode)
                    .onChange(async (value) => {
                        this.plugin.settings.debugMode = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }
}
