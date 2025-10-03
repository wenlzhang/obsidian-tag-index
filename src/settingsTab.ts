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
                        // Re-render settings to show/hide dependent settings
                        this.display();
                    }),
            );

        // Only show these settings if "Show line content" is enabled
        if (this.plugin.settings.showLineContent) {
            new Setting(containerEl)
                .setName("Line content click behavior")
                .setDesc(
                    "Choose what happens when you click on line content. 'Jump to line' opens the file at that line. 'Jump and search' also opens the search pane to show all occurrences.",
                )
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption("jumpToLine", "Jump to line")
                        .addOption("jumpAndSearch", "Jump to line and search")
                        .setValue(this.plugin.settings.lineContentClickBehavior)
                        .onChange(
                            async (value: "jumpToLine" | "jumpAndSearch") => {
                                this.plugin.settings.lineContentClickBehavior =
                                    value;
                                await this.plugin.saveSettings();
                            },
                        ),
                );

            new Setting(containerEl)
                .setName("Cursor position")
                .setDesc(
                    "Choose where the cursor is placed when jumping to a line. 'End of line' places the cursor at the end. 'Start of line' places it at the beginning.",
                )
                .addDropdown((dropdown) =>
                    dropdown
                        .addOption("end", "End of line")
                        .addOption("start", "Start of line")
                        .setValue(this.plugin.settings.cursorPosition)
                        .onChange(async (value: "start" | "end") => {
                            this.plugin.settings.cursorPosition = value;
                            await this.plugin.saveSettings();
                        }),
                );

            const refreshDelaySetting = new Setting(containerEl)
                .setName("Refresh delay")
                .setDesc(
                    "Time to wait after file changes before updating line content. Lower values = faster updates but more CPU usage. Recommended: 0.5s for small vaults, 2-5s for medium vaults, 30s-5min for large vaults, up to 60min for very large vaults.",
                );

            // Helper function to format delay display
            const formatDelay = (ms: number): string => {
                if (ms === 0) return "Instant";
                if (ms < 1000) return `${ms} ms`;
                if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
                return `${(ms / 60000).toFixed(1)} min`;
            };

            // Add value display
            const valueDisplay = refreshDelaySetting.controlEl.createDiv({
                cls: "tag-index-slider-value",
            });
            valueDisplay.setText(
                formatDelay(this.plugin.settings.refreshDelay),
            );

            // 0-60 minutes (3,600,000 ms) with 500ms steps
            refreshDelaySetting.addSlider((slider) =>
                slider
                    .setLimits(0, 3600000, 500)
                    .setValue(this.plugin.settings.refreshDelay)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.refreshDelay = value;
                        await this.plugin.saveSettings();
                        valueDisplay.setText(formatDelay(value));
                    }),
            );
        }

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
