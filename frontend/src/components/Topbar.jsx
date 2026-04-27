const tabs = ["Mail", "Calendar", "People", "Tasks"];

const filterLabels = {
  all: "All mail",
  unread: "Unread",
  starred: "Starred",
};

const sortLabels = {
  newest: "Newest first",
  oldest: "Oldest first",
  sender: "Sender A-Z",
  subject: "Subject A-Z",
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.3" />
    <path d="M12 19.2v2.3" />
    <path d="M4.9 4.9l1.6 1.6" />
    <path d="M17.5 17.5l1.6 1.6" />
    <path d="M2.5 12h2.3" />
    <path d="M19.2 12h2.3" />
    <path d="M4.9 19.1l1.6-1.6" />
    <path d="M17.5 6.5l1.6-1.6" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.7 8.7 0 1 0 10.2 10.2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M12 3.5l1.5 1.1 1.9-.2.9 1.7 1.8.7-.1 1.9 1.3 1.4-1.3 1.4.1 1.9-1.8.7-.9 1.7-1.9-.2L12 20.5l-1.5-1.1-1.9.2-.9-1.7-1.8-.7.1-1.9L4.7 12l1.3-1.4-.1-1.9 1.8-.7.9-1.7 1.9.2L12 3.5z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

const SyncIcon = ({ spinning = false }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
  >
    <path d="M20 12a8 8 0 0 0-13.7-5.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 4.5v4.7h4.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 12a8 8 0 0 0 13.7 5.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 19.5v-4.7h-4.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SidebarIcon = ({ isOpen }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
    <path d="M4 6.5h16" strokeLinecap="round" />
    <path d="M4 12h16" strokeLinecap="round" />
    <path d="M4 17.5h16" strokeLinecap="round" />
    {isOpen ? (
      <path d="M8.5 8.2L5.8 12l2.7 3.8" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M15.5 8.2l2.7 3.8-2.7 3.8" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const Topbar = ({
  activeWorkspaceTab,
  currentFilter,
  currentFolderLabel,
  currentSort,
  isSidebarOpen,
  mailboxSyncStatus,
  onMailboxSync,
  onOpenSettings,
  onToggleSidebar,
  onToggleTheme,
  onTabChange,
  onFilterChange,
  onSearchChange,
  onSortChange,
  searchQuery,
  theme,
}) => {
  const showMailControls = activeWorkspaceTab === "Mail";
  const syncConfigured = mailboxSyncStatus?.configured;
  const syncLabel = !syncConfigured
    ? "IMAP not configured"
    : mailboxSyncStatus?.inProgress
      ? "Syncing mailbox..."
      : mailboxSyncStatus?.lastSyncedAt
        ? `Last sync ${new Date(mailboxSyncStatus.lastSyncedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}`
        : "Mailbox ready";

  return (
    <header className="app-topbar border-b border-[#d9e4e2] bg-[rgba(250,252,251,0.84)] px-6 py-5 backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              {activeWorkspaceTab}
            </p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-[#173046]">
              {showMailControls ? currentFolderLabel : activeWorkspaceTab}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showMailControls ? (
              <button
                onClick={onToggleSidebar}
                aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#40536f] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#eef6f4]"
              >
                <SidebarIcon isOpen={isSidebarOpen} />
              </button>
            ) : null}
            {showMailControls ? (
              <button
                onClick={onMailboxSync}
                disabled={!syncConfigured || mailboxSyncStatus?.inProgress}
                aria-label="Sync mailbox"
                title={syncConfigured ? "Pull latest mailbox emails" : "IMAP is not configured"}
                className="theme-toggle-button flex h-11 items-center gap-2 rounded-full border border-[#d7e0ee] bg-white px-4 text-[#40536f] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#eef6f4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SyncIcon spinning={mailboxSyncStatus?.inProgress} />
                <span className="text-sm font-semibold">Sync mailbox</span>
              </button>
            ) : null}
            <button
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#eef6f4]"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`workspace-tab rounded-full px-5 py-2 text-sm font-medium ${
                  tab === activeWorkspaceTab
                    ? "bg-[linear-gradient(135deg,#157f86_0%,#10656a_100%)] text-white shadow-[0_10px_30px_rgba(21,127,134,0.22)]"
                    : "bg-[#f2f5f3] text-[#647784]"
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={onOpenSettings}
              aria-label="Open settings"
              title="Settings"
              className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-[#eef6f4]"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        {showMailControls ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search mail, people, files, and tasks"
                className="mail-search h-12 w-full rounded-[20px] border border-[#d7e0ee] bg-[#f7fafe] px-5 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />
              <p className="mt-2 px-1 text-xs font-medium text-[#7c8ba5]">{syncLabel}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="mail-toolbar-select flex items-center gap-3 rounded-[18px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-medium text-[#63748f] shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                <span>Filter</span>
                <select
                  value={currentFilter}
                  onChange={(event) => onFilterChange(event.target.value)}
                  className="bg-transparent text-sm font-semibold text-[#29415f] outline-none"
                >
                  {Object.entries(filterLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mail-toolbar-select flex items-center gap-3 rounded-[18px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-medium text-[#63748f] shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
                <span>Sort</span>
                <select
                  value={currentSort}
                  onChange={(event) => onSortChange(event.target.value)}
                  className="bg-transparent text-sm font-semibold text-[#29415f] outline-none"
                >
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Topbar;
