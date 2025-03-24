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
    }
}
