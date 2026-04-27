import { useMemo, useState } from "react";

const categories = [
  "Appearance",
  "Email settings",
  "Language and time",
  "Notifications",
];

const accentColors = ["#157f86", "#1f5eff", "#c7682f", "#2f8f63", "#b84b5f", "#7a6af0"];
const signatureFontFamilies = ["Aptos", "Segoe UI", "Georgia", "Courier New"];
const signatureFontSizes = [12, 14, 16, 18, 20];
const signatureTextColors = ["#1d2c45", "#2473c1", "#0f766e", "#b14a45", "#7c3aed"];
const signatureHighlightColors = ["transparent", "#fff4a3", "#ffd9d6", "#d9f2e6", "#dfeafe"];
const defaultSignatureStyle = {
  fontFamily: "Aptos",
  fontSize: 14,
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  textColor: "#1d2c45",
  highlightColor: "transparent",
  uppercase: false,
};

const timezones = [
  { value: "Asia/Calcutta", label: "India Standard Time" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "Asia/Singapore", label: "Singapore" },
];

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-7 w-12 rounded-full transition ${
      checked ? "bg-[var(--accent-color)]" : "bg-[#d8e1ef]"
    }`}
  >
    <span
      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
        checked ? "left-6" : "left-1"
      }`}
    />
  </button>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20z" />
    <path d="M13.8 6.8L17.2 10.2" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 12h10l1-12" />
    <path d="M9 7V4h6v3" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

const AppearanceCards = ({ settings, onSettingsChange }) => (
  <>
    <div>
      <h3 className="text-[1.6rem] font-semibold text-[#182840]">Appearance</h3>
      <p className="mt-2 text-sm text-[#70809a]">
        Tune how your workspace looks across mail, calendar, people, and tasks.
      </p>
    </div>

    <div className="mt-8">
      <p className="text-sm font-semibold text-[#556780]">Color mode</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { key: "light", label: "Light" },
          { key: "dark", label: "Dark" },
          { key: "system", label: "Use system" },
        ].map((option) => (
          <button
            key={option.key}
            onClick={() => onSettingsChange((current) => ({ ...current, themeMode: option.key }))}
            className={`rounded-[22px] border p-4 text-left transition ${
              settings.themeMode === option.key
                ? "border-[var(--accent-color)] bg-[rgba(var(--accent-rgb),0.08)]"
                : "border-[#dfe7f2] bg-white hover:bg-[#f8fbff]"
            }`}
          >
            <div
              className={`mb-3 h-16 rounded-[16px] border ${
                option.key === "dark"
                  ? "border-[#1c2b44] bg-[#202530]"
                  : option.key === "system"
                  ? "border-[#d9e1ee] bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_50%,#262b35_50%,#262b35_100%)]"
                  : "border-[#d9e1ee] bg-white"
              }`}
            />
            <p className="text-sm font-semibold text-[#21314d]">{option.label}</p>
          </button>
        ))}
      </div>
    </div>

    <div className="mt-8">
      <p className="text-sm font-semibold text-[#556780]">Accent color</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {accentColors.map((color) => (
          <button
            key={color}
            onClick={() => onSettingsChange((current) => ({ ...current, accentColor: color }))}
            className={`h-12 w-12 rounded-[14px] border-2 transition ${
              settings.accentColor === color ? "scale-[1.03] border-[#20314b]" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Use accent color ${color}`}
            title={color}
          />
        ))}
      </div>
    </div>

    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <label className="rounded-[20px] border border-[#dfe7f2] bg-white p-4">
        <p className="text-sm font-semibold text-[#556780]">Theme style</p>
        <select
          value={settings.themePreset}
          onChange={(event) =>
            onSettingsChange((current) => ({
              ...current,
              themePreset: event.target.value,
            }))
          }
          className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-sm text-[#21314d] outline-none"
        >
          <option value="classic">Classic</option>
          <option value="soft">Soft</option>
        </select>
      </label>

      <div className="rounded-[20px] border border-[#dfe7f2] bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#556780]">Desktop notifications</p>
            <p className="mt-1 text-sm text-[#7a8aa3]">Show alerts when a new mail comes in.</p>
          </div>
          <Toggle
            checked={settings.desktopNotifications}
            onChange={(value) =>
              onSettingsChange((current) => ({
                ...current,
                desktopNotifications: value,
              }))
            }
          />
        </div>
      </div>
    </div>
  </>
);

const LanguageAndTime = ({ settings, onSettingsChange }) => {
  const currentTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: settings.timeFormat !== "24h",
        timeZone: settings.timezone,
      }).format(new Date()),
    [settings.timeFormat, settings.timezone]
  );

  return (
    <>
      <div>
        <h3 className="text-[1.6rem] font-semibold text-[#182840]">Language and time</h3>
        <p className="mt-2 text-sm text-[#70809a]">
          Choose how times should appear across meetings, mail timestamps, and your profile.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="rounded-[20px] border border-[#dfe7f2] bg-white p-4">
          <p className="text-sm font-semibold text-[#556780]">Time zone</p>
          <select
            value={settings.timezone}
            onChange={(event) =>
              onSettingsChange((current) => ({
                ...current,
                timezone: event.target.value,
              }))
            }
            className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-sm text-[#21314d] outline-none"
          >
            {timezones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-[20px] border border-[#dfe7f2] bg-white p-4">
          <p className="text-sm font-semibold text-[#556780]">Time format</p>
          <select
            value={settings.timeFormat}
            onChange={(event) =>
              onSettingsChange((current) => ({
                ...current,
                timeFormat: event.target.value,
              }))
            }
            className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-sm text-[#21314d] outline-none"
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-[22px] border border-[#dfe7f2] bg-white p-5">
        <p className="text-sm font-semibold text-[#556780]">Preview</p>
        <p className="mt-3 text-3xl font-semibold text-[#182840]">{currentTime}</p>
        <p className="mt-2 text-sm text-[#7a8aa3]">
          Your app will now use this format in meeting times and mail timestamps.
        </p>
      </div>
    </>
  );
};

const Notifications = ({ settings, onSettingsChange }) => (
  <>
    <div>
      <h3 className="text-[1.6rem] font-semibold text-[#182840]">Notifications</h3>
      <p className="mt-2 text-sm text-[#70809a]">
        Control how loudly the workspace pulls your attention back in.
      </p>
    </div>

    <div className="mt-8 space-y-4">
      <div className="rounded-[22px] border border-[#dfe7f2] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#556780]">Desktop alerts</p>
            <p className="mt-1 text-sm text-[#7a8aa3]">Show browser-style popups for new activity.</p>
          </div>
          <Toggle
            checked={settings.desktopNotifications}
            onChange={(value) =>
              onSettingsChange((current) => ({
                ...current,
                desktopNotifications: value,
              }))
            }
          />
        </div>
      </div>

      <div className="rounded-[22px] border border-[#dfe7f2] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#556780]">Sound</p>
            <p className="mt-1 text-sm text-[#7a8aa3]">Play a sound for incoming mail and reminders.</p>
          </div>
          <Toggle
            checked={settings.soundNotifications}
            onChange={(value) =>
              onSettingsChange((current) => ({
                ...current,
                soundNotifications: value,
              }))
            }
          />
        </div>
      </div>
    </div>
  </>
);

const EmailSettings = ({ settings, onSettingsChange }) => {
  const [editorState, setEditorState] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const openEditor = (signature = null) => {
    setEditorState({
      id: signature?.id || null,
      name: signature?.name || "",
      content: signature?.content || "",
      includeBookings: Boolean(signature?.includeBookings),
      style: {
        ...defaultSignatureStyle,
        ...(signature?.style || {}),
      },
      defaultForNew: signature
        ? settings.defaultSignatureNew === signature.id
        : settings.signatures.length === 0,
      defaultForReplies: signature
        ? settings.defaultSignatureReply === signature.id
        : settings.signatures.length === 0,
    });
  };

  const saveSignature = () => {
    if (!editorState?.content.trim()) {
      return;
    }

    const derivedName =
      editorState.name.trim() ||
      editorState.content
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean) ||
      "My signature";

    const nextSignature = {
      id: editorState.id || `signature-${Date.now()}`,
      name: derivedName,
      content: editorState.content.trim(),
      includeBookings: editorState.includeBookings,
      style: editorState.style,
    };

    onSettingsChange((current) => {
      const existing = editorState.id
        ? current.signatures.filter((signature) => signature.id !== editorState.id)
        : current.signatures;
      const nextSignatures = [...existing, nextSignature];

      return {
        ...current,
        signatures: nextSignatures,
        defaultSignatureNew: editorState.defaultForNew
          ? nextSignature.id
          : current.defaultSignatureNew || nextSignature.id,
        defaultSignatureReply: editorState.defaultForReplies
          ? nextSignature.id
          : current.defaultSignatureReply || nextSignature.id,
      };
    });

    setEditorState(null);
  };

  const deleteSignature = (signatureId) => {
    onSettingsChange((current) => {
      const nextSignatures = current.signatures.filter(
        (signature) => signature.id !== signatureId
      );
      const fallbackId = nextSignatures[0]?.id || "";

      return {
        ...current,
        signatures: nextSignatures,
        defaultSignatureNew:
          current.defaultSignatureNew === signatureId
            ? fallbackId
            : current.defaultSignatureNew,
        defaultSignatureReply:
          current.defaultSignatureReply === signatureId
            ? fallbackId
            : current.defaultSignatureReply,
      };
    });

    if (editorState?.id === signatureId) {
      setEditorState(null);
    }
  };

  const updateEditorStyle = (key, value) => {
    setEditorState((current) => ({
      ...current,
      style: {
        ...current.style,
        [key]: value,
      },
    }));
  };

  const toggleEditorStyle = (key) => {
    setEditorState((current) => ({
      ...current,
      style: {
        ...current.style,
        [key]: !current.style[key],
      },
    }));
  };

  const textDecoration = [
    editorState?.style?.isUnderline ? "underline" : "",
    editorState?.style?.isStrike ? "line-through" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div>
        <h3 className="text-[1.6rem] font-semibold text-[#182840]">Email settings</h3>
        <p className="mt-2 text-sm text-[#70809a]">
          Manage the signatures that should be added by default to new messages and replies.
        </p>
      </div>

      <div className="mt-8 rounded-[22px] border border-[#dfe7f2] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 className="text-[1.15rem] font-semibold text-[#182840]">Signatures</h4>
            <p className="mt-2 text-sm leading-6 text-[#70809a]">
              Add, update, and choose the signature that appears by default in your mails.
            </p>
          </div>
          <button
            onClick={() => openEditor()}
            className="rounded-[14px] bg-[var(--accent-color)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Add signature
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <label className="rounded-[18px] border border-[#dfe7f2] bg-[#fbfdff] p-4">
            <p className="text-sm font-medium text-[#556780]">Default for new messages</p>
            <select
              value={settings.defaultSignatureNew}
              onChange={(event) =>
                onSettingsChange((current) => ({
                  ...current,
                  defaultSignatureNew: event.target.value,
                }))
              }
              className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-sm text-[#21314d] outline-none"
            >
              {settings.signatures.map((signature) => (
                <option key={signature.id} value={signature.id}>
                  {signature.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-[18px] border border-[#dfe7f2] bg-[#fbfdff] p-4">
            <p className="text-sm font-medium text-[#556780]">Default for replies and forwards</p>
            <select
              value={settings.defaultSignatureReply}
              onChange={(event) =>
                onSettingsChange((current) => ({
                  ...current,
                  defaultSignatureReply: event.target.value,
                }))
              }
              className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-sm text-[#21314d] outline-none"
            >
              {settings.signatures.map((signature) => (
                <option key={signature.id} value={signature.id}>
                  {signature.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-[18px] border border-[#dfe7f2] bg-[#fbfdff]">
          {settings.signatures.map((signature, index) => (
            <div
              key={signature.id}
              className={`flex flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between ${
                index < settings.signatures.length - 1 ? "border-b border-[#e8eef7]" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[16px] font-semibold text-[#1d2c45]">{signature.name}</p>
                  {settings.defaultSignatureNew === signature.id ? (
                    <span className="rounded-full bg-[#e8f2fe] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-color)]">
                      New mail
                    </span>
                  ) : null}
                  {settings.defaultSignatureReply === signature.id ? (
                    <span className="rounded-full bg-[#f1f4f9] px-2.5 py-1 text-[11px] font-semibold text-[#61748f]">
                      Replies
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-[#70809a]">
                  {signature.content}
                </p>
                {signature.includeBookings ? (
                  <p className="mt-2 text-sm font-medium text-[var(--accent-color)]">
                    Includes bookings link
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end md:self-start">
                <button
                  onClick={() => openEditor(signature)}
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#d7e0ee] bg-white text-[#4e627f]"
                  title="Edit signature"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => deleteSignature(signature.id)}
                  disabled={settings.signatures.length <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#ead4d1] bg-white text-[#b14a45] disabled:opacity-40"
                  title="Delete signature"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editorState ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10223f]/24 p-3 backdrop-blur-[4px]">
          <div className="flex max-h-[80vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[18px] border border-[#dfe7f2] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <div className="min-w-0">
                <h4 className="text-[1.5rem] font-semibold text-[#182840]">
                  {editorState.id ? "Edit signature" : "New signature"}
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <p className="hidden text-sm font-medium text-[#5d6f8a] md:block">
                  {currentUser?.email || "user@aksentt.app"}
                </p>
                <button
                  onClick={() => setEditorState(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#6c7c95] transition hover:bg-[#eef3fa] hover:text-[#21314d]"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="px-5">
              <div className="flex items-center gap-6 border-b border-[#e5ecf6] text-sm font-medium text-[#677992]">
                <button className="border-b-2 border-[var(--accent-color)] pb-3 text-[var(--accent-color)]">
                  Format text
                </button>
                <button className="pb-3 text-[#5c6f8a]">Insert</button>
              </div>
            </div>

            <div className="px-5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] border border-[#d7e0ee] bg-white px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <button
                  onClick={() => updateEditorStyle("fontSize", Math.max(12, editorState.style.fontSize - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8698b0] hover:bg-[#eef4fb]"
                  title="Decrease size"
                >
                  -
                </button>
                <button
                  onClick={() => updateEditorStyle("fontSize", Math.min(20, editorState.style.fontSize + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8698b0] hover:bg-[#eef4fb]"
                  title="Increase size"
                >
                  +
                </button>
                <select
                  value={editorState.style.fontFamily}
                  onChange={(event) => updateEditorStyle("fontFamily", event.target.value)}
                  className="h-8 min-w-[112px] rounded-[8px] border border-[#d7e0ee] bg-[#f8fbff] px-2.5 text-sm text-[#657891] outline-none"
                >
                  {signatureFontFamilies.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
                <select
                  value={editorState.style.fontSize}
                  onChange={(event) => updateEditorStyle("fontSize", Number(event.target.value))}
                  className="h-8 min-w-[68px] rounded-[8px] border border-[#d7e0ee] bg-[#f8fbff] px-2.5 text-sm text-[#657891] outline-none"
                >
                  {signatureFontSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {["B", "I", "U", "S"].map((item) => (
                  <button
                    key={item}
                    onClick={() =>
                      toggleEditorStyle(
                        item === "B"
                          ? "isBold"
                          : item === "I"
                          ? "isItalic"
                          : item === "U"
                          ? "isUnderline"
                          : "isStrike"
                      )
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-[8px] text-sm font-semibold ${
                      (item === "B" && editorState.style.isBold) ||
                      (item === "I" && editorState.style.isItalic) ||
                      (item === "U" && editorState.style.isUnderline) ||
                      (item === "S" && editorState.style.isStrike)
                        ? "bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent-color)]"
                        : "text-[#9aa9bd] hover:bg-[#eef4fb]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <select
                  value={editorState.style.textColor}
                  onChange={(event) => updateEditorStyle("textColor", event.target.value)}
                  className="h-8 min-w-[72px] rounded-[8px] border border-[#d7e0ee] bg-[#f8fbff] px-2 text-sm text-[#657891] outline-none"
                  title="Text color"
                >
                  {signatureTextColors.map((color) => (
                    <option key={color} value={color}>
                      Text
                    </option>
                  ))}
                </select>
                <select
                  value={editorState.style.highlightColor}
                  onChange={(event) => updateEditorStyle("highlightColor", event.target.value)}
                  className="h-8 min-w-[86px] rounded-[8px] border border-[#d7e0ee] bg-[#f8fbff] px-2 text-sm text-[#657891] outline-none"
                  title="Highlight"
                >
                  {signatureHighlightColors.map((color, index) => (
                    <option key={color} value={color}>
                      {index === 0 ? "No fill" : `Fill ${index}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => toggleEditorStyle("uppercase")}
                  className={`flex h-8 min-w-[44px] items-center justify-center rounded-[8px] px-2 text-sm font-semibold ${
                    editorState.style.uppercase
                      ? "bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent-color)]"
                      : "text-[#9aa9bd] hover:bg-[#eef4fb]"
                  }`}
                  title="Uppercase"
                >
                  aA
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() =>
                      setEditorState((current) => ({
                        ...current,
                        style: { ...defaultSignatureStyle },
                      }))
                    }
                    className="rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-[#7d90aa] hover:bg-[#eef4fb]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
              <textarea
                rows={6}
                value={editorState.content}
                onChange={(event) =>
                  setEditorState((current) => ({ ...current, content: event.target.value }))
                }
                placeholder={"Thanks & Regards,\nYour Name\nRole"}
                className="min-h-[210px] max-h-[34vh] w-full rounded-[12px] border border-[#d7e0ee] bg-white px-4 py-3 outline-none"
                style={{
                  fontFamily: editorState.style.fontFamily,
                  fontSize: `${editorState.style.fontSize}px`,
                  fontWeight: editorState.style.isBold ? 700 : 400,
                  fontStyle: editorState.style.isItalic ? "italic" : "normal",
                  textDecoration: textDecoration || "none",
                  color: editorState.style.textColor,
                  backgroundColor:
                    editorState.style.highlightColor === "transparent"
                      ? "#ffffff"
                      : editorState.style.highlightColor,
                  textTransform: editorState.style.uppercase ? "uppercase" : "none",
                  lineHeight: 1.8,
                }}
              />

              <div className="mt-3 flex flex-col gap-3 text-sm text-[#4f617b] md:flex-row md:flex-wrap md:items-center md:gap-5">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editorState.includeBookings}
                    onChange={(event) =>
                      setEditorState((current) => ({
                        ...current,
                        includeBookings: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[#bfd0e5] text-[var(--accent-color)]"
                  />
                  Include a link to my bookings page in my signature
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editorState.defaultForNew}
                    onChange={(event) =>
                      setEditorState((current) => ({
                        ...current,
                        defaultForNew: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[#bfd0e5] text-[var(--accent-color)]"
                  />
                  Set default for new messages
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editorState.defaultForReplies}
                    onChange={(event) =>
                      setEditorState((current) => ({
                        ...current,
                        defaultForReplies: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[#bfd0e5] text-[var(--accent-color)]"
                  />
                  Set default for replies and forwards
                </label>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5ecf6] bg-white px-5 py-3">
              <button
                onClick={() => setEditorState(null)}
                className="rounded-[12px] border border-[#d7e0ee] bg-white px-5 py-2.5 text-sm font-semibold text-[#4e627f]"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="rounded-[12px] bg-[var(--accent-color)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(var(--accent-rgb),0.24)]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const SettingsPanel = ({ onClose, settings, onSettingsChange }) => {
  const [activeCategory, setActiveCategory] = useState("Appearance");

  const content = {
    Appearance: <AppearanceCards settings={settings} onSettingsChange={onSettingsChange} />,
    "Email settings": (
      <EmailSettings settings={settings} onSettingsChange={onSettingsChange} />
    ),
    "Language and time": (
      <LanguageAndTime settings={settings} onSettingsChange={onSettingsChange} />
    ),
    Notifications: <Notifications settings={settings} onSettingsChange={onSettingsChange} />,
  };

  return (
    <div className="settings-panel-overlay fixed inset-0 z-50 flex items-start justify-center bg-[#10223f]/16 px-4 py-10 backdrop-blur-[4px]">
      <div className="settings-panel-shell flex max-h-[88vh] w-full max-w-[1280px] overflow-hidden rounded-[30px] border border-[#dfe7f2] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <aside className="w-[280px] shrink-0 border-r border-[#dfe7f2] bg-[#fbfdff] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[2rem] font-semibold text-[#182840]">Settings</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#6c7c95] transition hover:bg-[#eef3fa] hover:text-[#21314d]"
            >
              x
            </button>
          </div>

          <input
            placeholder="Search settings"
            className="mt-5 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none"
          />

          <div className="mt-6 space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex w-full items-center rounded-[14px] px-4 py-3 text-left text-sm font-semibold transition ${
                  activeCategory === category
                    ? "bg-[rgba(var(--accent-rgb),0.1)] text-[var(--accent-color)]"
                    : "text-[#5d6f8a] hover:bg-[#f2f6fb]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#fffdfb] p-8">
          <div className="max-w-3xl">{content[activeCategory]}</div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPanel;
