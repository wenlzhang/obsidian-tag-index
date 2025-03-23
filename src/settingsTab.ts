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

        containerEl.createEl("h2", { text: "Tag Index Settings" });

        containerEl.createEl("p", {
            text: "Tag Index allows you to create a separate list of important tags for quick access.",
            cls: "setting-item-description",
        });

        new Setting(containerEl)
            .setName("Add new tags to top")
            .setDesc("When enabled, new tags will be added to the top of the tag list. When disabled, they will be added to the bottom.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.addTagsToTop)
                .onChange(async (value) => {
                    this.plugin.settings.addTagsToTop = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.tagIndexView) {
                        this.plugin.tagIndexView.renderTags();
                    }
                })
            );

        containerEl.createEl("h3", { text: "How to use" });

        const instructions = containerEl.createEl("div", {
            cls: "tag-index-instructions",
        });
        instructions.createEl("p", {
            text: "1. Open the Tag Index view using the ribbon icon or command.",
        });
        instructions.createEl("p", {
            text: "2. Add tags by right-clicking on them in the editor or in the default tag pane.",
        });
        instructions.createEl("p", {
            text: '3. You can also use the "Add tag to Tag Index" command.',
        });
        instructions.createEl("p", {
            text: "4. Rearrange tags by dragging and dropping them.",
        });
        instructions.createEl("p", {
            text: "5. Click on a tag to see notes that use it.",
        });
    }
}
