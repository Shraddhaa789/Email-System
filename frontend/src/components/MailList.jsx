const formatDate = (value) =>
  new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

const formatTime = (value, timeFormat, timezone) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const getSenderName = (mail) =>
  mail.sender?.name || mail.sender?.email?.split("@")[0] || "Workspace user";

const getSenderEmail = (mail) => mail.sender?.email || "mail@workspace.app";

const MailList = ({
  emails,
  folderKey,
  folderLabel,
  onTogglePin,
  selectedMailId,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
  onSelectMail,
}) => {
  return (
    <section className="mail-list-panel min-h-[420px] border-r border-[#dbe4f2] bg-white lg:w-[410px] xl:w-[430px]">
      <div className="flex items-start justify-between border-b border-[#dbe4f2] px-5 py-4">
        <div>
          <h3 className="text-[1.15rem] font-semibold text-[#1c2b44]">{folderLabel}</h3>
          <p className="mt-1 text-sm text-[#7f8ca3]">
            {emails.length} conversations
          </p>
        </div>

        <span className="rounded-full bg-[#eaf3fd] px-3 py-1 text-xs font-semibold text-[#2574c4]">
          Syncing
        </span>
      </div>

      <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
        {emails.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#7f8ca3]">
            No emails match your inbox right now.
          </div>
        ) : (
          emails.map((mail) => {
            const isActive = selectedMailId === mail.id;
            const isUnread = folderKey === "inbox" && mail.isRead === false;

            return (
              <button
                key={mail.id}
                onClick={() => onSelectMail(mail)}
                className={`mail-list-item w-full border-b border-[#e5ecf6] px-5 py-5 text-left transition ${
                  isActive
                    ? "bg-[#edf4fd]"
                    : isUnread
                    ? "bg-[#eef5ff] hover:bg-[#e6f0fd]"
                    : "bg-white hover:bg-[#ffffff]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {isUnread ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2f80d1]" />
                      ) : null}
                      <p
                        className={`text-[16px] ${
                          isUnread ? "font-semibold text-[#1b2f4a]" : "font-medium text-[#3b4f69]"
                        }`}
                      >
                        {getSenderName(mail)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-[#7787a0]">
                      {getSenderEmail(mail)}
                    </p>
                  </div>

                  <p
                    className={`whitespace-nowrap text-sm ${
                      isUnread ? "font-semibold text-[#4f6d95]" : "text-[#7c8ba5]"
                    }`}
                  >
                    {formatDate(mail.createdAt)}, {formatTime(mail.createdAt, timeFormat, timezone)}
                  </p>
                </div>

                <h4
                  className={`mt-4 text-[18px] ${
                    isUnread ? "font-semibold text-[#1b2f4a]" : "font-medium text-[#314763]"
                  }`}
                >
                  {mail.subject}
                </h4>

                <p
                  className={`mt-3 max-w-[44ch] text-[15px] leading-6 ${
                    isUnread ? "text-[#5d7394]" : "text-[#73829a]"
                  }`}
                >
                  {mail.body}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin?.(mail);
                    }}
                    className={`mail-pin-chip rounded-full px-3 py-1 text-xs font-medium transition ${
                      mail.isPinned
                        ? "bg-[#dcecff] text-[#246ab2]"
                        : isUnread
                        ? "bg-[#e7f0fc] text-[#517096] hover:bg-[#dcecff]"
                        : "bg-[#eef3fa] text-[#7b8aa4] hover:bg-[#e8eef7]"
                    }`}
                  >
                    {mail.isPinned ? "Pinned" : "Important"}
                  </button>
                  {mail.isStarred ? (
                    <span className="rounded-full bg-[#fff1c7] px-3 py-1 text-xs font-medium text-[#8a6511]">
                      Starred
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

export default MailList;
