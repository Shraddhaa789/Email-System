const formatHeaderDate = (value) =>
  new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

const formatHeaderTime = (value, timeFormat, timezone) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const getSenderName = (mail) =>
  mail.folder === "draft"
    ? mail.receiver?.name || "Draft"
    : mail.sender?.name || mail.sender?.email?.split("@")[0] || "Workspace user";

const getSenderEmail = (mail) =>
  mail.folder === "draft"
    ? mail.receiver?.email || "Draft recipient"
    : mail.sender?.email || "mail@workspace.app";

const getInitials = (mail) =>
  getSenderName(mail)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const MailView = ({
  mail,
  onCloseMail,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
}) => {
  if (!mail) {
    return (
      <section className="mail-view-shell flex min-h-[420px] flex-1 items-center justify-center bg-[#fbfdff] p-10 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Reading Pane
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[#1a2a42]">
            Select a conversation
          </h2>
          <p className="mt-3 text-[15px] text-[#7a8aa3]">
            Pick a message from the focused list to view its details here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mail-view-shell flex min-h-[420px] flex-1 flex-col bg-[#fbfdff]">
      <div className="border-b border-[#dbe4f2] px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="max-w-4xl text-[2.05rem] font-semibold leading-tight text-[#16253d]">
            {mail.subject}
          </h2>

          <button
            onClick={onCloseMail}
            className="mail-close-button shrink-0 rounded-[14px] border border-[#d7e0ee] bg-white px-4 py-2 text-sm font-semibold text-[#36506f] transition hover:bg-[#eef4fb] hover:text-[#21344d]"
          >
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[15px] text-[#73829a]">
          <span className="font-semibold text-[#1f3554]">{getSenderName(mail)}</span>
          <span>{getSenderEmail(mail)}</span>
          <span>
            {formatHeaderDate(mail.createdAt)}, {formatHeaderTime(mail.createdAt, timeFormat, timezone)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {mail.folder === "trash" ? (
          <div className="mb-4 max-w-3xl rounded-[18px] border border-[#f1d8b8] bg-[#fff8ec] px-4 py-3 text-sm text-[#8a6a2f]">
            Trash keeps deleted mails for 30 days unless you permanently delete them.
          </div>
        ) : null}

        <article className="mail-content-card max-w-3xl rounded-[30px] border border-[#dfe7f2] bg-white p-6 shadow-[0_22px_45px_rgba(27,44,74,0.06)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fd] text-lg font-semibold text-[#2473c1]">
              {getInitials(mail)}
            </div>

            <div>
              <p className="text-lg font-semibold text-[#1c2b44]">
                {getSenderName(mail)}
              </p>
              <p className="text-[15px] text-[#7787a0]">
                {mail.folder === "draft"
                  ? "saved in Drafts"
                  : "to Product, Design, Engineering"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-[16px] leading-8 text-[#465975]">
            {mail.body.split("\n").map((line, index) => (
              <p key={`${mail.id}-${index}`}>{line || "\u00A0"}</p>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};

export default MailView;
