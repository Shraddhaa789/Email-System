const favorites = [
  { key: "inbox", label: "Inbox" },
  { key: "sent", label: "Sent Items" },
  { key: "drafts", label: "Drafts" },
  { key: "archive", label: "Archive" },
  { key: "trash", label: "Trash" },
];

const meetingDotColors = ["bg-[#157f86]", "bg-[#2f8f63]", "bg-[#c7682f]", "bg-[#6d7ee8]"];

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatTime = (value, timeFormat, timezone) =>
  new Date(`2026-04-08T${value}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const FolderIcon = ({ folderKey }) => {
  if (folderKey === "inbox") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4 8.5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z" />
        <path d="M4 9h5l1.5 2h9.5" />
      </svg>
    );
  }

  if (folderKey === "sent") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4.5 11.5 19 4l-3.2 15-4.5-5-4.6-2.5Z" />
        <path d="m11.3 14 2.8-2.8" />
      </svg>
    );
  }

  if (folderKey === "drafts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4 19.5h4l9.2-9.2-4-4L4 15.5v4Z" />
        <path d="m11.8 7.8 4 4" />
      </svg>
    );
  }

  if (folderKey === "archive") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="4" y="5" width="16" height="4.5" rx="1.5" />
        <path d="M6 9.5h12v8.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9.5Z" />
        <path d="M10 13h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M6.5 7.5h11" />
      <path d="M9 4.5h6" />
      <path d="M8 7.5v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-10" />
    </svg>
  );
};

const Sidebar = ({
  activeFolder,
  counts,
  isCollapsed = false,
  onCompose,
  onOpenProfile,
  onSelectMeeting,
  onSelectFolder,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
  todayMeetings = [],
  user,
}) => {
  const displayName = user?.name || "Aksentt User";
  const displayEmail = user?.email || "user@aksentt.app";

  return (
    <aside
      className={`app-sidebar w-full border-b border-[#d9e4e2] bg-[linear-gradient(180deg,#ecf3f1_0%,#e5eceb_100%)] transition-all duration-300 lg:border-b-0 lg:border-r ${
        isCollapsed ? "p-4 lg:w-[92px]" : "p-6 lg:w-[290px]"
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          {isCollapsed ? null : (
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              Workspace
            </p>
          )}

          <div className={`flex items-start gap-4 ${isCollapsed ? "mt-1 justify-center" : "mt-4"}`}>
            <button
              onClick={onOpenProfile}
              className="profile-trigger flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#157f86_0%,#10656a_100%)] text-lg font-semibold text-white shadow-[0_12px_30px_rgba(21,127,134,0.25)] transition hover:brightness-[1.03]"
            >
              {getInitials(displayName)}
            </button>

            {isCollapsed ? null : (
              <div>
                <h2 className="text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#173046]">
                  {displayName.split(" ")[0]}
                  <br />
                  {displayName.split(" ").slice(1).join(" ") || "Workspace"}
                </h2>
                <p className="mt-2 text-[15px] text-[#6e807f]">{displayEmail}</p>
              </div>
            )}
          </div>

          <button
            onClick={onCompose}
            title="New mail"
            className={`primary-sidebar-button mt-7 flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#157f86_0%,#10656a_100%)] text-base font-semibold text-white shadow-[0_18px_32px_rgba(21,127,134,0.24)] transition hover:brightness-[1.03] ${
              isCollapsed ? "h-14 w-full text-2xl" : "w-full px-5 py-3.5"
            }`}
          >
            {isCollapsed ? "+" : "New mail"}
          </button>

          <div className="mt-7">
            {isCollapsed ? null : (
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
                Favorites
              </p>
            )}

            <div className="mt-3 space-y-2">
              {favorites.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onSelectFolder(item.key)}
                  title={item.label}
                  className={`sidebar-folder-button relative flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-[17px] ${
                    activeFolder === item.key
                      ? "bg-white text-[#20394f] shadow-[0_12px_28px_rgba(31,42,68,0.08)]"
                      : "text-[#708281] hover:bg-white/75"
                  }`}
                >
                  <span
                    className={
                      isCollapsed
                        ? "mx-auto flex h-10 w-10 items-center justify-center rounded-[14px]"
                        : ""
                    }
                  >
                    {isCollapsed ? <FolderIcon folderKey={item.key} /> : item.label}
                  </span>
                  {counts[item.key] ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeFolder === item.key
                          ? "bg-[#e4f4f4] text-[#157f86]"
                          : "text-[#157f86]"
                      } ${isCollapsed ? "absolute right-1.5 top-1.5 min-w-[20px] px-1.5 text-center" : ""}`}
                    >
                      {counts[item.key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {isCollapsed ? null : (
            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
                Today
              </p>

              <div className="sidebar-meetings-card mt-3 rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf9_100%)] p-3 shadow-[0_18px_32px_rgba(31,42,68,0.08)]">
                {todayMeetings.length === 0 ? (
                  <div className="px-3 py-5 text-sm text-[#8190a8]">
                    No meetings scheduled for today.
                  </div>
                ) : (
                  todayMeetings.map((meeting, index) => (
                    <button
                      key={meeting.id}
                      onClick={() => onSelectMeeting?.(meeting)}
                      className={`sidebar-meeting-button flex items-center justify-between gap-3 px-3 py-3 ${
                        index < todayMeetings.length - 1
                          ? "border-b border-[#e7edf6]"
                          : ""
                      } w-full rounded-[14px] text-left transition hover:bg-[#f6f9fe]`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[#20394f]">
                          {meeting.title}
                        </p>
                        <p className="text-sm text-[#7a8b99]">
                          {formatTime(meeting.time, timeFormat, timezone)}
                        </p>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          meetingDotColors[index % meetingDotColors.length]
                        }`}
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
          }}
          title="Logout"
          className={`sidebar-logout-button rounded-[16px] border border-[#d7e0ee] bg-white/90 px-4 py-3 text-sm font-semibold text-[#5e7187] ${
            isCollapsed ? "w-full" : ""
          }`}
        >
          {isCollapsed ? "↩" : "Logout"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
