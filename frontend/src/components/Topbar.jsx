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

const Topbar = ({
  activeWorkspaceTab,
  currentFilter,
  currentFolderLabel,
  currentSort,
  onOpenSettings,
  onToggleTheme,
  onTabChange,
  onFilterChange,
  onSearchChange,
  onSortChange,
  searchQuery,
  theme,
}) => {
  const showMailControls = activeWorkspaceTab === "Mail";

  return (
    <header className="app-topbar border-b border-[#dbe4f2] bg-white/70 px-6 py-5 backdrop-blur-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              {activeWorkspaceTab}
            </p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-none text-[#16253d]">
              {showMailControls ? currentFolderLabel : activeWorkspaceTab}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-[#eef4fb]"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`workspace-tab rounded-full px-5 py-2 text-sm font-medium ${
                  tab === activeWorkspaceTab
                    ? "bg-[#2676c3] text-white shadow-[0_10px_30px_rgba(38,118,195,0.22)]"
                    : "bg-[#edf2f8] text-[#74839d]"
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={onOpenSettings}
              aria-label="Open settings"
              title="Settings"
              className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-[#eef4fb]"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        {showMailControls ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search mail, people, files, and tasks"
              className="mail-search h-12 flex-1 rounded-[18px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
            />

            <div className="flex flex-wrap gap-3">
              <label className="mail-toolbar-select flex items-center gap-3 rounded-[16px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-medium text-[#63748f] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
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

              <label className="mail-toolbar-select flex items-center gap-3 rounded-[16px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-medium text-[#63748f] shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
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
