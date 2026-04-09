const favorites = [
  { key: "inbox", label: "Inbox" },
  { key: "sent", label: "Sent Items" },
  { key: "drafts", label: "Drafts" },
  { key: "archive", label: "Archive" },
  { key: "trash", label: "Trash" },
];

const meetingDotColors = ["bg-[#2574c4]", "bg-[#1fa06b]", "bg-[#dd7d07]", "bg-[#8558d6]"];

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

const Sidebar = ({
  activeFolder,
  counts,
  onCompose,
  onOpenProfile,
  onSelectMeeting,
  onSelectFolder,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
  todayMeetings = [],
  user,
}) => {
  const displayName = user?.name || "Workspace User";
  const displayEmail = user?.email || "user@workspace.app";

  return (
    <aside className="app-sidebar w-full border-b border-[#dbe4f2] bg-[linear-gradient(180deg,#eef4fb_0%,#e8eff8_100%)] p-6 lg:w-[290px] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
            Workspace
          </p>

          <div className="mt-4 flex items-start gap-4">
            <button
              onClick={onOpenProfile}
            className="profile-trigger flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f70be] text-lg font-semibold text-white shadow-[0_12px_30px_rgba(31,112,190,0.25)] transition hover:bg-[#1963a8]"
            >
              {getInitials(displayName)}
            </button>

            <div>
              <h2 className="text-[2.1rem] font-semibold leading-[1.05] text-[#17273e]">
                {displayName.split(" ")[0]}
                <br />
                {displayName.split(" ").slice(1).join(" ") || "Workspace"}
              </h2>
              <p className="mt-2 text-[15px] text-[#74839d]">{displayEmail}</p>
            </div>
          </div>

          <button
            onClick={onCompose}
            className="primary-sidebar-button mt-7 flex w-full items-center justify-center rounded-[18px] bg-[#2473c1] px-5 py-3.5 text-base font-semibold text-white shadow-[0_18px_32px_rgba(36,115,193,0.24)] transition hover:bg-[#1f68af]"
          >
            New mail
          </button>

          <div className="mt-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              Favorites
            </p>

            <div className="mt-3 space-y-2">
              {favorites.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onSelectFolder(item.key)}
                  className={`sidebar-folder-button flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-[17px] ${
                    activeFolder === item.key
                      ? "bg-white text-[#24344e] shadow-[0_12px_28px_rgba(31,42,68,0.08)]"
                      : "text-[#74839d] hover:bg-white/70"
                  }`}
                >
                  <span>{item.label}</span>
                  {counts[item.key] ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeFolder === item.key
                          ? "bg-[#e9f2fc] text-[#2574c4]"
                          : "text-[#2574c4]"
                      }`}
                    >
                      {counts[item.key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              Today
            </p>

            <div className="sidebar-meetings-card mt-3 rounded-[22px] bg-white p-3 shadow-[0_18px_32px_rgba(31,42,68,0.08)]">
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
                      <p className="truncate text-[15px] font-semibold text-[#23344d]">
                        {meeting.title}
                      </p>
                      <p className="text-sm text-[#8190a8]">
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
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
          }}
          className="sidebar-logout-button rounded-[16px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-semibold text-[#6a7891]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
