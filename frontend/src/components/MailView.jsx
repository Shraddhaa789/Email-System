import { useState } from "react";

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
    : mail.sender?.name || mail.sender?.email?.split("@")[0] || "Aksentt user";

const getSenderEmail = (mail) =>
  mail.folder === "draft"
    ? mail.receiver?.email || "Draft recipient"
    : mail.sender?.email || "mail@aksentt.app";

const formatRecipientList = (recipients = []) =>
  recipients
    .map((recipient) => recipient.name || recipient.email)
    .filter(Boolean)
    .join("; ");

const normalizeRecipients = (recipients = []) =>
  recipients
    .map((recipient) => ({
      name: recipient?.name || recipient?.email || "Recipient",
      email: recipient?.email || "",
    }))
    .filter((recipient) => recipient.name);

const getVisibleBody = (body = "") =>
  body
    .split("\n")
    .filter((line) => !/^\s*(Cc|Bcc):/i.test(line))
    .join("\n")
    .trimEnd();

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
  onDownloadAttachment,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
}) => {
  const [showSenderEmail, setShowSenderEmail] = useState(false);
  const [expandedRecipientKey, setExpandedRecipientKey] = useState(null);

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

  const toRecipients =
    mail.toRecipients?.length
      ? normalizeRecipients(mail.toRecipients)
      : normalizeRecipients(
          mail.receiver?.email || mail.receiver?.name
            ? [{ name: mail.receiver?.name, email: mail.receiver?.email }]
            : []
        );
  const ccRecipients = normalizeRecipients(mail.ccRecipients);

  const renderRecipients = (label, recipients) => {
    if (!recipients.length) {
      return null;
    }

    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#5c6f8a]">{label}:</span>
        {recipients.map((recipient, index) => {
          const key = `${label}-${recipient.email || recipient.name}-${index}`;
          const isExpanded = expandedRecipientKey === key;

          return (
            <span key={key} className="inline-flex items-center gap-2">
              <button
                onClick={() =>
                  setExpandedRecipientKey((current) => (current === key ? null : key))
                }
                className="text-[#1c2b44] transition hover:text-[#1c2b44]"
              >
                {recipient.name}
              </button>
              {isExpanded && recipient.email ? (
                <span className="text-[#2473c1]">{recipient.email}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <section className="mail-view-shell flex min-h-[420px] flex-1 flex-col bg-[#fbfdff]">
      <div className="border-b border-[#dbe4f2] bg-white/70 px-6 py-6 backdrop-blur-sm">
        <h2 className="text-[1.72rem] font-semibold leading-tight text-[#16253d]">
          {mail.subject}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(235,244,255,0.85),transparent_28%),linear-gradient(180deg,#fbfdff_0%,#f7faff_100%)] p-6">
        {mail.folder === "trash" ? (
          <div className="mb-4 rounded-[18px] border border-[#f1d8b8] bg-[#fff8ec] px-4 py-3 text-sm text-[#8a6a2f]">
            Trash keeps deleted mails for 30 days unless you permanently delete them.
          </div>
        ) : null}

        <article className="mail-content-card min-h-full w-full rounded-[32px] border border-[#dfe7f2] bg-white/96 p-6 shadow-[0_24px_48px_rgba(27,44,74,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fd] text-lg font-semibold text-[#2473c1] shadow-[0_10px_24px_rgba(36,115,193,0.12)]">
                {getInitials(mail)}
              </div>

              <div>
                <button
                  onClick={() => setShowSenderEmail((current) => !current)}
                  className="text-left text-lg font-semibold text-[#1c2b44] transition hover:text-[#2473c1]"
                >
                  {getSenderName(mail)}
                </button>
                {showSenderEmail ? (
                  <p className="mt-1 text-sm font-medium text-[#2473c1]">
                    {getSenderEmail(mail)}
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-[#7787a0]">
                  {renderRecipients("To", toRecipients)}
                  {renderRecipients("Cc", ccRecipients)}
                  {mail.bccRecipients?.length ? (
                    <span>
                      <span className="font-medium text-[#5c6f8a]">Bcc:</span>{" "}
                      {formatRecipientList(mail.bccRecipients)}
                    </span>
                  ) : null}
                  <span>
                    {formatHeaderDate(mail.createdAt)}, {formatHeaderTime(mail.createdAt, timeFormat, timezone)}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={onCloseMail}
                className="mail-close-button rounded-[14px] border border-[#d7e0ee] bg-white px-4 py-2 text-sm font-semibold text-[#36506f] transition hover:bg-[#eef4fb] hover:text-[#21344d]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-8 whitespace-pre-wrap text-[16px] leading-8 text-[#465975]">
            {getVisibleBody(mail.body)}
          </div>

          {mail.attachments?.length ? (
            <div className="mt-8 border-t border-[#e5ecf6] pt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b9bb4]">
                Attachments
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {mail.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => onDownloadAttachment?.(mail, attachment)}
                    className="rounded-[18px] border border-[#d7e0ee] bg-[#f8fbff] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <p className="max-w-[220px] truncate text-sm font-semibold text-[#2d4360]">
                      {attachment.name}
                    </p>
                    <p className="mt-1 text-xs text-[#7d8ea7]">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
};

export default MailView;
