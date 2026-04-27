const IconBox = ({ children }) => (
  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-current">
    {children}
  </span>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 12h10l1-12" />
    <path d="M9 7V4h6v3" />
  </svg>
);

const ArchiveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M4 6h16v4H4z" />
    <path d="M6 10h12v9H6z" />
    <path d="M10 14h4" />
  </svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M12 3l8 4v5c0 5-3.4 7.7-8 9-4.6-1.3-8-4-8-9V7l8-4z" />
    <path d="M12 8v5" />
    <path d="M12 16h.01" />
  </svg>
);

const SweepIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M3 16h7" />
    <path d="M5 12h9" />
    <path d="M7 8h11" />
    <path d="M14 19l3 2 4-5" />
  </svg>
);

const MoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M4 7h11v10H4z" />
    <path d="M15 12h5" />
    <path d="M17 9l3 3-3 3" />
  </svg>
);

const ReplyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M10 8L5 12l5 4" />
    <path d="M19 18c0-4.4-3.2-6-9-6H5" />
  </svg>
);

const ReplyAllIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M9 8L4 12l5 4" />
    <path d="M14 8l-5 4 5 4" />
    <path d="M20 18c0-4.4-3.2-6-9-6H4" />
  </svg>
);

const ForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M14 8l5 4-5 4" />
    <path d="M5 18c0-4.4 3.2-6 9-6h5" />
  </svg>
);

const TeamsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
    <path d="M9 6h7v12H9z" />
    <path d="M4 8h5v8H4z" />
    <path d="M16 9h4v7h-4z" />
    <path d="M7 10h4" />
    <path d="M9 10v7" />
  </svg>
);

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M13 2L5 13h5l-1 9 8-11h-5l1-9z" />
  </svg>
);

const ReadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M4 6h16v12H4z" />
    <path d="M4 8l8 6 8-6" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M12 3.8l2.54 5.15 5.68.82-4.11 4 .97 5.66L12 16.73 6.92 19.4l.97-5.66-4.11-4 5.68-.82L12 3.8z" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
    <circle cx="6" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="18" cy="12" r="1.8" />
  </svg>
);

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-[#4d607c] transition hover:bg-[#eef4fb] hover:text-[#21344d]";

const selectClass =
  "rounded-full border border-[#d7e0ee] bg-white px-3 py-2 text-[12px] font-medium text-[#4d607c] outline-none focus:border-[#8fb9e1]";

const quickStepOptions = [
  { value: "", label: "Quick steps" },
  { value: "archive-read", label: "Archive + mark read" },
  { value: "star-archive", label: "Star + archive" },
];

const moreOptions = [
  { value: "", label: "More" },
  { value: "move-inbox", label: "Move to Inbox" },
  { value: "move-draft", label: "Move to Drafts" },
  { value: "move-archive", label: "Move to Archive" },
  { value: "move-trash", label: "Move to Trash" },
  { value: "report", label: "Report" },
  { value: "share", label: "Share to Teams" },
  { value: "read-toggle", label: "Read / Unread" },
  { value: "flag-toggle", label: "Flag / Unflag" },
  { value: "pin-toggle", label: "Pin / Unpin" },
];

const MailActionBar = ({
  activeFolder,
  bulkSelectionCount = 0,
  mail,
  onBulkArchive,
  onBulkDelete,
  onBulkMove,
  onBulkPermanentDelete,
  onBulkReadToggle,
  onClearSelection,
  onArchive,
  onDelete,
  onForward,
  onMove,
  onPermanentDelete,
  onPinToggle,
  onQuickStep,
  onReadToggle,
  onReply,
  onReplyAll,
  onReport,
  onShare,
  onStarToggle,
  onSweep,
}) => {
  if (bulkSelectionCount > 0) {
    if (activeFolder === "trash") {
      return (
        <div className="mail-action-bar border-b border-[#dbe4f2] bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="mr-2 text-sm font-semibold text-[#41556f]">
              {bulkSelectionCount} selected
            </span>
            <button onClick={() => onBulkMove?.("inbox")} className={buttonClass}>
              <IconBox><MoveIcon /></IconBox>
              <span>Undo</span>
            </button>
            <button
              onClick={onBulkPermanentDelete}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-[#b14a45] transition hover:bg-[#fff1f0]"
            >
              <IconBox><DeleteIcon /></IconBox>
              <span>Delete forever</span>
            </button>
            <button onClick={onClearSelection} className={buttonClass}>
              <span>Clear</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mail-action-bar border-b border-[#dbe4f2] bg-white px-5 py-3">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          <span className="mr-2 text-sm font-semibold text-[#41556f]">
            {bulkSelectionCount} selected
          </span>
          <button onClick={onBulkDelete} className={buttonClass}>
            <IconBox><DeleteIcon /></IconBox>
            <span>Delete</span>
          </button>
          <button onClick={onBulkArchive} className={buttonClass}>
            <IconBox><ArchiveIcon /></IconBox>
            <span>Archive</span>
          </button>
          <button onClick={onBulkReadToggle} className={buttonClass}>
            <IconBox><ReadIcon /></IconBox>
            <span>Read / Unread</span>
          </button>
          <label className="inline-flex items-center gap-1.5">
            <IconBox><MoveIcon /></IconBox>
            <select
              defaultValue=""
              onChange={(event) => {
                onBulkMove?.(event.target.value);
                event.target.value = "";
              }}
              className={selectClass}
            >
              <option value="">Move selected</option>
              <option value="inbox">Inbox</option>
              <option value="draft">Drafts</option>
              <option value="archive">Archive</option>
              <option value="trash">Trash</option>
            </select>
          </label>
          <button onClick={onClearSelection} className={buttonClass}>
            <span>Clear</span>
          </button>
        </div>
      </div>
    );
  }

  if (!mail) return null;

  if (activeFolder === "trash") {
    return (
      <div className="mail-action-bar border-b border-[#dbe4f2] bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onMove("inbox")} className={buttonClass}>
            <IconBox><MoveIcon /></IconBox>
            <span>Undo</span>
          </button>
          <button
            onClick={onPermanentDelete}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium text-[#b14a45] transition hover:bg-[#fff1f0]"
          >
            <IconBox><DeleteIcon /></IconBox>
            <span>Delete forever</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mail-action-bar border-b border-[#dbe4f2] bg-white px-5 py-3">
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        <button onClick={onDelete} className={buttonClass}>
          <IconBox><DeleteIcon /></IconBox>
          <span>Delete</span>
        </button>
        <button onClick={onArchive} className={buttonClass}>
          <IconBox><ArchiveIcon /></IconBox>
          <span>Archive</span>
        </button>
        <button onClick={onSweep} className={buttonClass}>
          <IconBox><SweepIcon /></IconBox>
          <span>Sweep</span>
        </button>
        <div className="mx-1 h-5 w-px shrink-0 bg-[#dfe7f2]" />
        <button onClick={onReply} className={buttonClass}>
          <IconBox><ReplyIcon /></IconBox>
          <span>Reply</span>
        </button>
        <button onClick={onReplyAll} className={buttonClass}>
          <IconBox><ReplyAllIcon /></IconBox>
          <span>Reply all</span>
        </button>
        <button onClick={onForward} className={buttonClass}>
          <IconBox><ForwardIcon /></IconBox>
          <span>Forward</span>
        </button>
        <label className="inline-flex items-center gap-1.5">
          <IconBox><BoltIcon /></IconBox>
          <select
            defaultValue=""
            onChange={(event) => {
              onQuickStep(event.target.value);
              event.target.value = "";
            }}
            className={selectClass}
          >
            {quickStepOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <IconBox><MoreIcon /></IconBox>
          <select
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;

              if (value.startsWith("move-")) {
                onMove(value.replace("move-", ""));
              } else if (value === "report") {
                onReport();
              } else if (value === "share") {
                onShare();
              } else if (value === "read-toggle") {
                onReadToggle();
              } else if (value === "flag-toggle") {
                onStarToggle();
              } else if (value === "pin-toggle") {
                onPinToggle();
              }

              event.target.value = "";
            }}
            className={selectClass}
          >
            {moreOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

export default MailActionBar;
