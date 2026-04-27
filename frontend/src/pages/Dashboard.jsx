import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import Sidebar from "../components/Sidebar";
import MailList from "../components/MailList";
import MailActionBar from "../components/MailActionBar";
import MailView from "../components/MailView";
import Topbar from "../components/Topbar";
import ComposeModal from "../components/ComposeModal";
import CalendarView from "../components/CalendarView";
import PeopleView from "../components/PeopleView";
import TasksView from "../components/TasksView";
import ProfilePanel from "../components/ProfilePanel";
import SettingsPanel from "../components/SettingsPanel";
import { buildApiUrl, SOCKET_URL } from "../config/api";

const padDatePart = (value) => String(value).padStart(2, "0");

const getDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const addDays = (date, offset) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const calendarTodayKey = getDateKey(new Date());
const todayDate = new Date(`${calendarTodayKey}T09:00:00`);

const initialMeetings = [
  {
    id: "meeting-1",
    title: "Inbox architecture review",
    date: getDateKey(todayDate),
    time: "09:30",
    attendees: "Maya, Lina, Product",
    agenda: "Review follow-up tasks for sent, drafts, and archive flows.",
    location: "Teams link",
  },
  {
    id: "meeting-2",
    title: "Stakeholder rollout sync",
    date: getDateKey(addDays(todayDate, 1)),
    time: "13:00",
    attendees: "Ops, Delivery, Support",
    agenda: "Align deployment windows and confirm the communication plan.",
    location: "Boardroom B",
  },
  {
    id: "meeting-3",
    title: "Delivery checklist standup",
    date: getDateKey(addDays(todayDate, 2)),
    time: "11:00",
    attendees: "Frontend, QA, Product",
    agenda: "Walk through delivery blockers and test coverage.",
    location: "Focus room",
  },
];

const getStoredUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const normalizeMailText = (value = "") =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeMailRecipients = (recipients = []) =>
  (Array.isArray(recipients) ? recipients : [])
    .map((entry) => entry?.email?.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");

const buildMailDedupKey = (mail) => {
  const createdAt = new Date(mail.createdAt);
  const createdAtKey = Number.isNaN(createdAt.getTime())
    ? ""
    : new Date(Math.floor(createdAt.getTime() / 1000) * 1000).toISOString();

  return [
    mail.sender?.email?.trim().toLowerCase() || "",
    mail.receiverId || "",
    mail.folder || "",
    normalizeMailText(mail.subject || ""),
    normalizeMailText(mail.body || ""),
    createdAtKey,
    normalizeMailRecipients(mail.toRecipients),
    normalizeMailRecipients(mail.ccRecipients),
    normalizeMailRecipients(mail.bccRecipients),
  ].join("|");
};

const mergeUniqueEmails = (incomingEmails = []) => {
  const seen = new Set();

  return incomingEmails.filter((mail) => {
    const key = buildMailDedupKey(mail);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const RailToggleIcon = ({ isCollapsed }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M4 6.5h16" strokeLinecap="round" />
    <path d="M4 12h16" strokeLinecap="round" />
    <path d="M4 17.5h16" strokeLinecap="round" />
    {isCollapsed ? (
      <path d="M15.2 8.4L18 12l-2.8 3.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M8.8 8.4L6 12l2.8 3.6" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const Dashboard = ({ onSettingsChange, onToggleTheme, settings, theme }) => {
  const [emails, setEmails] = useState([]);
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeConfig, setComposeConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(getStoredUser);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("Mail");
  const [meetings, setMeetings] = useState(initialMeetings);
  const [calendarSelection, setCalendarSelection] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedMailIds, setSelectedMailIds] = useState([]);
  const [mailboxSyncStatus, setMailboxSyncStatus] = useState(null);

  const folderLabels = {
    inbox: "Inbox",
    sent: "Sent Items",
    drafts: "Drafts",
    archive: "Archive",
    trash: "Trash",
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    let socket;
    let pollTimer;

    const fetchEmails = async (folder) => {
      try {
        const endpointMap = {
          inbox: "inbox",
          sent: "sent",
          drafts: "drafts",
          archive: "archive",
          trash: "trash",
        };
        const res = await axios.get(
          buildApiUrl(`/email/${endpointMap[folder]}`),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setEmails(mergeUniqueEmails(res.data));
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    if (token) {
      fetchEmails(activeFolder);

      pollTimer = window.setInterval(() => {
        fetchEmails(activeFolder);
      }, 30000);

      socket = io(SOCKET_URL, {
        auth: { token },
      });

      socket.on("newEmail", (newMail) => {
        if (activeFolder === "inbox") {
          setEmails((current) => mergeUniqueEmails([newMail, ...current]));
        }
      });
    }

    return () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
      socket?.off("newEmail");
      socket?.disconnect();
    };
  }, [activeFolder, refreshTick]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    axios
      .get(buildApiUrl("/email/sync/status"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setMailboxSyncStatus(response.data);
      })
      .catch((error) => {
        console.error("Mailbox status error:", error);
      });
  }, [refreshTick]);

  const visibleEmails = emails
    .filter((mail) => {
      const haystack = [
        mail.subject,
        mail.body,
        mail.sender?.name,
        mail.sender?.email,
        mail.receiver?.name,
        mail.receiver?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchQuery.toLowerCase());
    })
    .filter((mail) => {
      if (activeFilter === "unread") {
        return mail.isRead === false;
      }

      if (activeFilter === "starred") {
        return mail.isStarred;
      }

      return true;
    })
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }

      if (activeSort === "oldest") {
        return new Date(left.createdAt) - new Date(right.createdAt);
      }

      if (activeSort === "sender") {
        const leftSender = (
          left.sender?.name ||
          left.sender?.email ||
          left.receiver?.name ||
          left.receiver?.email ||
          ""
        ).toLowerCase();
        const rightSender = (
          right.sender?.name ||
          right.sender?.email ||
          right.receiver?.name ||
          right.receiver?.email ||
          ""
        ).toLowerCase();

        return leftSender.localeCompare(rightSender);
      }

      if (activeSort === "subject") {
        return left.subject.toLowerCase().localeCompare(right.subject.toLowerCase());
      }

      return new Date(right.createdAt) - new Date(left.createdAt);
    });

  const selectedMail =
    visibleEmails.find((mail) => mail.id === selectedMailId) || null;

  const handleMailDeleted = (id) => {
    setEmails((current) => current.filter((mail) => mail.id !== id));
    setSelectedMailIds((current) => current.filter((mailId) => mailId !== id));
    if (selectedMailId === id) {
      setSelectedMailId(null);
    }
  };

  const handleMailArchived = (updatedMail) => {
    if (activeFolder === "archive") {
      setEmails((current) =>
        current.map((mail) => (mail.id === updatedMail.id ? updatedMail : mail))
      );
      setSelectedMailId(updatedMail.id);
      return;
    }

    setEmails((current) => current.filter((mail) => mail.id !== updatedMail.id));
    setSelectedMailIds((current) => current.filter((mailId) => mailId !== updatedMail.id));
    if (selectedMailId === updatedMail.id) {
      setSelectedMailId(null);
    }
  };

  const handleMailUpdated = (updatedMail) => {
    setEmails((current) =>
      current.map((mail) => (mail.id === updatedMail.id ? updatedMail : mail))
    );
    setSelectedMailId(updatedMail.id);
  };

  const selectedBulkIds = selectedMailIds.filter((id) =>
    visibleEmails.some((mail) => mail.id === id)
  );

  const counts = {
    inbox: activeFolder === "inbox" ? emails.length : 0,
    sent: activeFolder === "sent" ? emails.length : 0,
    drafts: activeFolder === "drafts" ? emails.length : 0,
    archive: activeFolder === "archive" ? emails.length : 0,
    trash: activeFolder === "trash" ? emails.length : 0,
  };

  const refreshMailbox = (folder = activeFolder) => {
    if (folder !== activeFolder) {
      setActiveFolder(folder);
    }
    setRefreshTick((value) => value + 1);
  };

  const handleSelectFolder = (folder) => {
    setSelectedMailIds([]);
    setSelectedMailId(null);
    setIsComposeOpen(false);
    setActiveFolder(folder);
  };

  const requestConfig = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  const handleMailboxSync = async () => {
    try {
      const response = await axios.post(
        buildApiUrl("/email/sync/now"),
        {},
        requestConfig
      );

      setMailboxSyncStatus(response.data);
      refreshMailbox("inbox");
    } catch (error) {
      console.error(error);
    }
  };

  const updateMailRequest = async (url, data = {}) => {
    const response = await axios.patch(url, data, requestConfig);
    return response.data;
  };

  const handleDeleteMail = async () => {
    if (!selectedMail) return;
    try {
      await axios.delete(buildApiUrl(`/email/${selectedMail.id}`), requestConfig);
      handleMailDeleted(selectedMail.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePermanentDeleteMail = async () => {
    if (!selectedMail) return;
    try {
      await axios.delete(
        buildApiUrl(`/email/permanent/${selectedMail.id}`),
        requestConfig
      );
      handleMailDeleted(selectedMail.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleArchiveMail = async () => {
    if (!selectedMail) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/archive/${selectedMail.id}`)
      );
      handleMailArchived(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReportMail = async () => {
    if (!selectedMail) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/report/${selectedMail.id}`)
      );
      handleMailArchived(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSweepMail = async () => {
    if (!selectedMail) return;
    try {
      await axios.post(
        buildApiUrl(`/email/sweep/${selectedMail.id}`),
        {},
        requestConfig
      );
      refreshMailbox();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMoveMail = async (folder) => {
    if (!selectedMail || !folder) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/move/${selectedMail.id}`),
        { folder }
      );

      if (folder === activeFolder) {
        handleMailUpdated(updated);
      } else if (folder === "archive") {
        handleMailArchived(updated);
      } else if (folder === "trash") {
        handleMailDeleted(selectedMail.id);
      } else {
        refreshMailbox(folder);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReadToggle = async () => {
    if (!selectedMail) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/read/${selectedMail.id}`)
      );
      handleMailUpdated(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStarToggle = async () => {
    if (!selectedMail) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/star/${selectedMail.id}`)
      );
      handleMailUpdated(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePinToggle = async (mail) => {
    if (!mail) return;
    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/pin/${mail.id}`)
      );
      setEmails((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      if (selectedMailId === updated.id) {
        setSelectedMailId(updated.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectMail = async (mail) => {
    setSelectedMailId(mail.id);

    if (activeFolder !== "inbox" || mail.isRead) {
      return;
    }

    try {
      const updated = await updateMailRequest(
        buildApiUrl(`/email/read/${mail.id}`)
      );
      setEmails((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleMailSelection = (mailId) => {
    setSelectedMailIds((current) =>
      current.includes(mailId)
        ? current.filter((id) => id !== mailId)
        : [...current, mailId]
    );
  };

  const handleToggleAllVisible = (mailList) => {
    const visibleIds = mailList.map((mail) => mail.id);
    const areAllSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedMailIds.includes(id));

    setSelectedMailIds((current) =>
      areAllSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  };

  const runBulkAction = async (action) => {
    if (selectedBulkIds.length === 0) return;

    try {
      await Promise.all(selectedBulkIds.map((id) => action(id)));
      setSelectedMailIds([]);
      if (selectedBulkIds.includes(selectedMailId)) {
        setSelectedMailId(null);
      }
      refreshMailbox();
    } catch (error) {
      console.error(error);
    }
  };

  const handleBulkDelete = async () =>
    runBulkAction((id) => axios.delete(buildApiUrl(`/email/${id}`), requestConfig));

  const handleBulkPermanentDelete = async () =>
    runBulkAction((id) =>
      axios.delete(buildApiUrl(`/email/permanent/${id}`), requestConfig)
    );

  const handleBulkArchive = async () =>
    runBulkAction((id) =>
      axios.patch(buildApiUrl(`/email/archive/${id}`), {}, requestConfig)
    );

  const handleBulkReadToggle = async () =>
    runBulkAction((id) =>
      axios.patch(buildApiUrl(`/email/read/${id}`), {}, requestConfig)
    );

  const handleBulkMove = async (folder) => {
    if (!folder) return;
    await runBulkAction((id) =>
      axios.patch(buildApiUrl(`/email/move/${id}`), { folder }, requestConfig)
    );
  };

  const openComposeForMail = (modeLabel, values) => {
    setSelectedMailId(null);
    setComposeConfig({ modeLabel, values });
    setIsComposeOpen(true);
  };

  const handleReply = () => {
    if (!selectedMail) return;
    openComposeForMail("Reply", {
      to: selectedMail.sender?.email || "",
      subject: selectedMail.subject.startsWith("Re: ")
        ? selectedMail.subject
        : `Re: ${selectedMail.subject}`,
      body: `\n\n--- Original message ---\n${selectedMail.body}`,
    });
  };

  const handleReplyAll = () => {
    if (!selectedMail) return;
    openComposeForMail("Reply all", {
      to: [selectedMail.sender?.email, selectedMail.receiver?.email]
        .filter(Boolean)
        .join(", "),
      subject: selectedMail.subject.startsWith("Re: ")
        ? selectedMail.subject
        : `Re: ${selectedMail.subject}`,
      body: `\n\n--- Original message ---\n${selectedMail.body}`,
    });
  };

  const handleForward = () => {
    if (!selectedMail) return;
    openComposeForMail("Forward", {
      to: "",
      subject: selectedMail.subject.startsWith("Fwd: ")
        ? selectedMail.subject
        : `Fwd: ${selectedMail.subject}`,
      body: `\n\n--- Original message ---\n${selectedMail.body}`,
    });
  };

  const handleShare = () => {
    if (!selectedMail) return;
    const summary = `${selectedMail.subject}\nFrom: ${selectedMail.sender?.name || ""} <${
      selectedMail.sender?.email || ""
    }>\n\n${selectedMail.body}`;
    navigator.clipboard?.writeText(summary).catch(() => {});
  };

  const handleQuickStep = async (value) => {
    if (!selectedMail || !value) return;
    try {
      if (value === "archive-read") {
        await updateMailRequest(buildApiUrl(`/email/read/${selectedMail.id}`));
        const updated = await updateMailRequest(
          buildApiUrl(`/email/archive/${selectedMail.id}`)
        );
        handleMailArchived(updated);
        return;
      }

      if (value === "star-archive") {
        await updateMailRequest(buildApiUrl(`/email/star/${selectedMail.id}`));
        const updated = await updateMailRequest(
          buildApiUrl(`/email/archive/${selectedMail.id}`)
        );
        handleMailArchived({ ...updated, isStarred: true });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownloadAttachment = async (mail, attachment) => {
    if (!mail?.id || !attachment?.id) {
      return;
    }

    try {
      const response = await axios.get(
        buildApiUrl(`/email/${mail.id}/attachment/${attachment.id}`),
        {
          ...requestConfig,
          responseType: "blob",
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen p-0 text-[#1a2942] md:p-2">
      <div
        className={`theme-app-shell flex min-h-screen w-full flex-col overflow-hidden border border-white/70 bg-white/55 shadow-[0_30px_80px_rgba(31,51,81,0.12)] backdrop-blur-sm md:min-h-[calc(100vh-16px)] md:rounded-[30px] ${
          activeWorkspaceTab === "Mail" ? "lg:flex-row" : ""
        }`}
      >
        {activeWorkspaceTab === "Mail" ? (
          <Sidebar
            activeFolder={activeFolder}
            counts={counts}
            isCollapsed={isSidebarCollapsed}
            onCompose={() => {
              setComposeConfig(null);
              setIsComposeOpen(true);
            }}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSelectFolder={handleSelectFolder}
            onSelectMeeting={(meeting) => {
              setCalendarSelection({
                meetingId: meeting.id,
                date: meeting.date,
              });
              setActiveWorkspaceTab("Calendar");
            }}
            timeFormat={settings.timeFormat}
            timezone={settings.timezone}
            todayMeetings={meetings.filter((meeting) => meeting.date === calendarTodayKey)}
            user={user}
          />
        ) : null}

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Topbar
            activeWorkspaceTab={activeWorkspaceTab}
            currentFilter={activeFilter}
            currentFolderLabel={folderLabels[activeFolder]}
            currentSort={activeSort}
            isSidebarOpen={!isSidebarCollapsed}
            mailboxSyncStatus={mailboxSyncStatus}
            onMailboxSync={handleMailboxSync}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
            onToggleTheme={onToggleTheme}
            onTabChange={setActiveWorkspaceTab}
            onFilterChange={setActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSortChange={setActiveSort}
            theme={theme}
          />

          {activeWorkspaceTab === "Mail" ? (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <MailList
                emails={visibleEmails}
                folderKey={activeFolder}
                folderLabel={folderLabels[activeFolder]}
                onToggleAllVisible={handleToggleAllVisible}
                onToggleMailSelection={handleToggleMailSelection}
                onTogglePin={handlePinToggle}
                selectedMailId={selectedMail?.id}
                selectedMailIds={selectedBulkIds}
                timeFormat={settings.timeFormat}
                timezone={settings.timezone}
                onSelectMail={handleSelectMail}
              />
              <div className="flex min-h-0 flex-1 flex-col">
                {!isComposeOpen ? (
                  <>
                    <MailActionBar
                      activeFolder={activeFolder}
                      bulkSelectionCount={selectedBulkIds.length}
                      mail={selectedMail}
                      onBulkArchive={handleBulkArchive}
                      onBulkDelete={handleBulkDelete}
                      onBulkMove={handleBulkMove}
                      onBulkPermanentDelete={handleBulkPermanentDelete}
                      onBulkReadToggle={handleBulkReadToggle}
                      onClearSelection={() => setSelectedMailIds([])}
                      onArchive={handleArchiveMail}
                      onDelete={handleDeleteMail}
                      onForward={handleForward}
                      onMove={handleMoveMail}
                      onPermanentDelete={handlePermanentDeleteMail}
                      onPinToggle={() => handlePinToggle(selectedMail)}
                      onQuickStep={handleQuickStep}
                      onReadToggle={handleReadToggle}
                      onReply={handleReply}
                      onReplyAll={handleReplyAll}
                      onReport={handleReportMail}
                      onShare={handleShare}
                      onStarToggle={handleStarToggle}
                      onSweep={handleSweepMail}
                    />
                    <MailView
                      mail={selectedMail}
                      onCloseMail={() => setSelectedMailId(null)}
                      onDownloadAttachment={handleDownloadAttachment}
                      timeFormat={settings.timeFormat}
                      timezone={settings.timezone}
                    />
                  </>
                ) : (
                  <ComposeModal
                    initialValues={composeConfig?.values}
                    modeLabel={composeConfig?.modeLabel}
                    onClose={() => setIsComposeOpen(false)}
                    onSaved={(targetFolder) => {
                      setIsComposeOpen(false);
                      handleSelectFolder(targetFolder);
                      setRefreshTick((value) => value + 1);
                    }}
                    settings={settings}
                    variant="pane"
                  />
                )}
              </div>
            </div>
          ) : null}

          {activeWorkspaceTab === "Calendar" ? (
            <CalendarView
              key={
                calendarSelection
                  ? `${calendarSelection.meetingId}-${calendarSelection.date}`
                  : "calendar-default"
              }
              focusedMeeting={calendarSelection}
              meetings={meetings}
              setMeetings={setMeetings}
              timeFormat={settings.timeFormat}
              timezone={settings.timezone}
            />
          ) : null}
          {activeWorkspaceTab === "People" ? <PeopleView /> : null}
          {activeWorkspaceTab === "Tasks" ? <TasksView /> : null}
        </main>
      </div>

      {isComposeOpen && activeWorkspaceTab !== "Mail" ? (
        <ComposeModal
          initialValues={composeConfig?.values}
          modeLabel={composeConfig?.modeLabel}
          onClose={() => setIsComposeOpen(false)}
          onSaved={(targetFolder) => {
            handleSelectFolder(targetFolder);
            setRefreshTick((value) => value + 1);
          }}
          settings={settings}
        />
      ) : null}

      {isProfileOpen ? (
        <ProfilePanel
          onClose={() => setIsProfileOpen(false)}
          onUserUpdated={setUser}
          user={user}
        />
      ) : null}

      {isSettingsOpen ? (
        <SettingsPanel
          onClose={() => setIsSettingsOpen(false)}
          onSettingsChange={onSettingsChange}
          settings={settings}
        />
      ) : null}
    </div>
  );
};

export default Dashboard;
