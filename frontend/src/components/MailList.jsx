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

const getPrimaryPerson = (mail, folderKey) => {
  if (folderKey === "sent") {
    const firstRecipient = mail.toRecipients?.[0];
    return {
      name:
        firstRecipient?.name ||
        mail.receiver?.name ||
        firstRecipient?.email?.split("@")[0] ||
        mail.receiver?.email?.split("@")[0] ||
        "Recipient",
      email: firstRecipient?.email || mail.receiver?.email || "",
    };
  }

  return {
    name: mail.sender?.name || mail.sender?.email?.split("@")[0] || "Workspace user",
    email: mail.sender?.email || "mail@workspace.app",
  };
};

const getPersonInitials = (name) => {
  const senderName = name.trim();
  const parts = senderName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].includes(".")) {
    const dotParts = parts[0].split(".").filter(Boolean);
    if (dotParts.length >= 2) {
      return `${dotParts[0][0]}${dotParts[1][0]}`.toUpperCase();
    }
  }

  return senderName.slice(0, 2).toUpperCase();
};

const MailList = ({
  emails,
  folderKey,
  folderLabel,
  onToggleAllVisible,
  onToggleMailSelection,
  onTogglePin,
  selectedMailId,
  selectedMailIds = [],
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
  onSelectMail,
}) => {
  const allVisibleSelected = emails.length > 0 && emails.every((mail) => selectedMailIds.includes(mail.id));

  return (
    <section className="mail-list-panel min-h-[420px] border-r border-[#dbe4f2] bg-[linear-gradient(180deg,#fcfdff_0%,#f7faff_100%)] lg:w-[390px] xl:w-[410px]">
      <div className="flex items-start justify-between border-b border-[#dbe4f2] px-5 py-5">
        <div className="mail-list-header-group flex items-start gap-3">
          <div className="mail-list-header-leading mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
            <span className="mail-list-header-avatar" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                <path d="M4 9h4.6l1.6 2.2h3.6L15.4 9H20" />
              </svg>
            </span>
            <label className="mail-list-header-checkbox absolute flex h-5 w-5 items-center justify-center">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => onToggleAllVisible?.(emails)}
                className="h-4 w-4 rounded border-[#bfd0e6] text-[#2473c1] focus:ring-[#8fb9e1]"
              />
            </label>
          </div>

          <div>
          <h3 className="text-[1.2rem] font-semibold text-[#1c2b44]">{folderLabel}</h3>
          <p className="mt-1 text-sm text-[#7f8ca3]">
            {selectedMailIds.length > 0
              ? `${selectedMailIds.length} selected`
              : `${emails.length} conversations`}
          </p>
          </div>
        </div>

        <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2574c4]">
          Syncing
        </span>
      </div>

      <div className="max-h-[calc(100vh-250px)] overflow-y-auto px-3 py-3">
        {emails.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#7f8ca3]">
            No emails match your inbox right now.
          </div>
        ) : (
          emails.map((mail) => {
            const isActive = selectedMailId === mail.id;
            const isUnread = folderKey === "inbox" && mail.isRead === false;
            const isChecked = selectedMailIds.includes(mail.id);
            const primaryPerson = getPrimaryPerson(mail, folderKey);
            const senderInitials = getPersonInitials(primaryPerson.name);

            return (
              <button
                key={mail.id}
                onClick={() => onSelectMail(mail)}
                className={`mail-list-item mb-2.5 w-full rounded-[20px] border px-4 py-3.5 text-left transition ${
                  isActive
                    ? "border-[#99bde4] bg-[#edf4fd] shadow-[0_16px_30px_rgba(37,94,164,0.10)]"
                    : isUnread
                    ? "border-[#d6e4f6] bg-[#eef5ff] hover:border-[#bfd4ee] hover:bg-[#e9f2ff]"
                    : "border-[#e5ecf6] bg-white hover:border-[#dbe6f3] hover:bg-[#fbfdff]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mail-row-leading mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                      <span className="mail-row-avatar">
                        {senderInitials}
                      </span>
                      <label
                        className="mail-row-checkbox absolute flex h-5 w-5 items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleMailSelection?.(mail.id)}
                          className="h-4 w-4 rounded border-[#bfd0e6] text-[#2473c1] focus:ring-[#8fb9e1]"
                        />
                      </label>
                    </div>

                    <div>
                    <div className="flex items-center gap-2">
                      {isUnread ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2f80d1] shadow-[0_0_0_4px_rgba(47,128,209,0.14)]" />
                      ) : null}
                      <p
                        className={`text-[15px] ${
                          isUnread ? "font-semibold text-[#1b2f4a]" : "font-medium text-[#3b4f69]"
                        }`}
                      >
                        {primaryPerson.name}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[13px] text-[#7787a0]">
                      {primaryPerson.email || "No email address"}
                    </p>
                    </div>
                  </div>

                  <p
                    className={`whitespace-nowrap pl-2 text-[13px] ${
                      isUnread ? "font-semibold text-[#4f6d95]" : "text-[#7c8ba5]"
                    }`}
                  >
                    {formatDate(mail.createdAt)}, {formatTime(mail.createdAt, timeFormat, timezone)}
                  </p>
                </div>

                <h4
                  className={`mt-3 text-[17px] ${
                    isUnread ? "font-semibold text-[#1b2f4a]" : "font-medium text-[#314763]"
                  }`}
                >
                  {mail.subject}
                </h4>

                <p
                  className={`mail-row-preview mt-2 max-w-[44ch] text-[14px] leading-5 ${
                    isUnread ? "text-[#5d7394]" : "text-[#73829a]"
                  }`}
                >
                  {mail.body}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin?.(mail);
                    }}
                    className={`mail-pin-chip rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
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
