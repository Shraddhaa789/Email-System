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

const calendarTodayKey = "2026-04-08";

const initialMeetings = [
  {
    id: "meeting-1",
    title: "Inbox architecture review",
    date: "2026-04-08",
    time: "09:30",
    attendees: "Maya, Lina, Product",
    agenda: "Review follow-up tasks for sent, drafts, and archive flows.",
    location: "Teams link",
  },
  {
    id: "meeting-2",
    title: "Stakeholder rollout sync",
    date: "2026-04-09",
    time: "13:00",
    attendees: "Ops, Delivery, Support",
    agenda: "Align deployment windows and confirm the communication plan.",
    location: "Boardroom B",
  },
  {
    id: "meeting-3",
    title: "Delivery checklist standup",
    date: "2026-04-10",
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
          `http://localhost:5000/api/email/${endpointMap[folder]}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setEmails(res.data);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    if (token) {
      fetchEmails(activeFolder);

      socket = io("http://localhost:5000", {
        auth: { token },
      });

      socket.on("newEmail", (newMail) => {
        if (activeFolder === "inbox") {
          setEmails((current) => [newMail, ...current]);
        }
      });
    }

    return () => {
      socket?.off("newEmail");
      socket?.disconnect();
    };
  }, [activeFolder, refreshTick]);

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

  const requestConfig = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  const updateMailRequest = async (url, data = {}) => {
    const response = await axios.patch(url, data, requestConfig);
    return response.data;
  };

  const handleDeleteMail = async () => {
    if (!selectedMail) return;
    try {
      await axios.delete(`http://localhost:5000/api/email/${selectedMail.id}`, requestConfig);
      handleMailDeleted(selectedMail.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePermanentDeleteMail = async () => {
    if (!selectedMail) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/email/permanent/${selectedMail.id}`,
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
        `http://localhost:5000/api/email/archive/${selectedMail.id}`
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
        `http://localhost:5000/api/email/report/${selectedMail.id}`
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
        `http://localhost:5000/api/email/sweep/${selectedMail.id}`,
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
        `http://localhost:5000/api/email/move/${selectedMail.id}`,
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
        `http://localhost:5000/api/email/read/${selectedMail.id}`
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
        `http://localhost:5000/api/email/star/${selectedMail.id}`
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
        `http://localhost:5000/api/email/pin/${mail.id}`
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
        `http://localhost:5000/api/email/read/${mail.id}`
      );
      setEmails((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const openComposeForMail = (modeLabel, values) => {
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
        await updateMailRequest(`http://localhost:5000/api/email/read/${selectedMail.id}`);
        const updated = await updateMailRequest(
          `http://localhost:5000/api/email/archive/${selectedMail.id}`
        );
        handleMailArchived(updated);
        return;
      }

      if (value === "star-archive") {
        await updateMailRequest(`http://localhost:5000/api/email/star/${selectedMail.id}`);
        const updated = await updateMailRequest(
          `http://localhost:5000/api/email/archive/${selectedMail.id}`
        );
        handleMailArchived({ ...updated, isStarred: true });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen px-3 py-3 text-[#1a2942] md:px-5 md:py-5">
      <div
        className={`theme-app-shell mx-auto flex min-h-[calc(100vh-24px)] max-w-[1600px] flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white/55 shadow-[0_30px_80px_rgba(31,51,81,0.12)] backdrop-blur-sm ${
          activeWorkspaceTab === "Mail" ? "lg:flex-row" : ""
        }`}
      >
        {activeWorkspaceTab === "Mail" ? (
          <Sidebar
            activeFolder={activeFolder}
            counts={counts}
            onCompose={() => {
              setComposeConfig(null);
              setIsComposeOpen(true);
            }}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSelectFolder={setActiveFolder}
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

        <main className="flex min-w-0 flex-1 flex-col">
          <Topbar
            activeWorkspaceTab={activeWorkspaceTab}
            currentFilter={activeFilter}
            currentFolderLabel={folderLabels[activeFolder]}
            currentSort={activeSort}
            onOpenSettings={() => setIsSettingsOpen(true)}
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
                onTogglePin={handlePinToggle}
                selectedMailId={selectedMail?.id}
                timeFormat={settings.timeFormat}
                timezone={settings.timezone}
                onSelectMail={handleSelectMail}
              />
              <div className="flex min-h-0 flex-1 flex-col">
                <MailActionBar
                  activeFolder={activeFolder}
                  mail={selectedMail}
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
                  timeFormat={settings.timeFormat}
                  timezone={settings.timezone}
                />
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

      {isComposeOpen && (
        <ComposeModal
          initialValues={composeConfig?.values}
          modeLabel={composeConfig?.modeLabel}
          onClose={() => setIsComposeOpen(false)}
          onSaved={(targetFolder) => {
            setActiveFolder(targetFolder);
            setRefreshTick((value) => value + 1);
          }}
          settings={settings}
        />
      )}

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
