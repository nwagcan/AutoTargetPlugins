/**
 * @name AutoTargetControl
 * @author nxtwxrk
 * @description Auto Mute Auto Kick Anti Mute
 * @version 28.0.0
 */

module.exports = class AutoTargetControl {
    constructor() {
        this.settings = { 
            enabled: false, antiMute: true, targetId: "", mode: "mute", interval: 600 
        };
        this.loop = null;
    }

    start() {
        this.settings = BdApi.Data.load("AutoTargetControl", "settings") || this.settings;
        this.handleKeyDown = (e) => { if (e.key === "F4") this.showGUI(); };
        document.addEventListener("keydown", this.handleKeyDown);
        this.runLoop();
        BdApi.UI.showToast("Protocol v28 Active!", {type: "info"});
    }

    stop() {
        if (this.loop) clearInterval(this.loop);
        document.removeEventListener("keydown", this.handleKeyDown);
    }

    showGUI() {
        BdApi.UI.showConfirmationModal("nwagcan AutoTargetControl", 
            BdApi.React.createElement("div", { style: { padding: "10px", color: "#eee" } },
                BdApi.React.createElement("button", {
                    style: { width: "100%", padding: "12px", borderRadius: "6px", border: "none", background: this.settings.enabled ? "#ed4245" : "#23a559", color: "white", fontWeight: "bold", marginBottom: "15px", cursor: "pointer" },
                    onClick: (e) => {
                        this.settings.enabled = !this.settings.enabled;
                        e.target.innerText = this.settings.enabled ? "STOP SYSTEM" : "START TARGETING";
                        e.target.style.background = this.settings.enabled ? "#ed4245" : "#23a559";
                    }
                }, this.settings.enabled ? "STOP SYSTEM" : "START TARGETING"),

                BdApi.React.createElement("label", { style: { fontSize: "11px", fontWeight: "bold", color: "#888" } }, "TARGET USER ID"),
                BdApi.React.createElement("input", {
                    style: { width: "100%", padding: "10px", background: "#111", border: "1px solid #444", color: "#fff", borderRadius: "4px", marginTop: "5px", marginBottom: "15px" },
                    defaultValue: this.settings.targetId, placeholder: "Enter ID...",
                    onChange: (e) => this.settings.targetId = e.target.value
                }),

                BdApi.React.createElement("label", { style: { fontSize: "11px", fontWeight: "bold", color: "#888" } }, "ACTION MODE"),
                BdApi.React.createElement("select", {
                    style: { width: "100%", padding: "10px", background: "#111", border: "1px solid #444", color: "#fff", borderRadius: "4px", marginTop: "5px", marginBottom: "15px" },
                    defaultValue: this.settings.mode,
                    onChange: (e) => this.settings.mode = e.target.value
                },
                    BdApi.React.createElement("option", { value: "mute" }, "Mute"),
                    BdApi.React.createElement("option", { value: "disconnect" }, "Disconnect (Kick from Voice)")
                ),

                BdApi.React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", background: "#222", padding: "10px", borderRadius: "6px" } },
                    BdApi.React.createElement("input", { 
                        type: "checkbox", defaultChecked: this.settings.antiMute,
                        onChange: (e) => this.settings.antiMute = e.target.checked
                    }),
                    BdApi.React.createElement("label", { style: { fontSize: "13px", fontWeight: "bold" } }, "ANTI-MUTE PROTECTION")
                )
            ),
            { confirmText: "SAVE SETTINGS", onConfirm: () => { BdApi.Data.save("AutoTargetControl", "settings", this.settings); this.runLoop(); } }
        );
    }

    runLoop() {
        if (this.loop) clearInterval(this.loop);
        this.loop = setInterval(async () => {
            try {
                const VoiceActions = BdApi.Webpack.getModule(m => m.setServerMute && m.setChannel);
                const VoiceStateStore = BdApi.Webpack.getModule(m => m.getVoiceState && !m.setServerMute);
                const GuildStore = BdApi.Webpack.getModule(m => m.getGuildId);
                const UserStore = BdApi.Webpack.getModule(m => m.getCurrentUser);

                if (!VoiceActions || !VoiceStateStore || !GuildStore || !UserStore) return;

                const gId = GuildStore.getGuildId();
                if (!gId) return;
                const selfId = UserStore.getCurrentUser().id;

                // 1. SELF PROTECTION
                if (this.settings.antiMute) {
                    const selfState = VoiceStateStore.getVoiceState(gId, selfId);
                    if (selfState?.mute) {
                        await VoiceActions.setServerMute(gId, selfId, false, selfState.deaf).catch(() => {});
                    }
                }

                // 2. TARGET CONTROL
                if (this.settings.enabled && this.settings.targetId) {
                    const target = VoiceStateStore.getVoiceState(gId, this.settings.targetId);
                    if (target?.channelId) {
                        if (this.settings.mode === "mute" && !target.mute) {
                            await VoiceActions.setServerMute(gId, this.settings.targetId, true, target.deaf).catch(() => {});
                        } 
                        else if (this.settings.mode === "disconnect") {
                            await VoiceActions.setChannel(gId, this.settings.targetId, null).catch(() => {});
                        }
                    }
                }
            } catch (e) {}
        }, this.settings.interval);
    }
};