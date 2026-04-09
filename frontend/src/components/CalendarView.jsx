import { useMemo, useState } from "react";

const selectedDateKey = "2026-04-08";
const weekDays = [
  { key: "2026-04-07", label: "Tue", day: "07" },
  { key: "2026-04-08", label: "Wed", day: "08" },
  { key: "2026-04-09", label: "Thu", day: "09" },
  { key: "2026-04-10", label: "Fri", day: "10" },
  { key: "2026-04-11", label: "Sat", day: "11" },
];

const miniCalendarDays = [
  "",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
];

const createEmptyForm = (date = selectedDateKey) => ({
  title: "",
  date,
  time: "11:30",
  attendees: "",
  location: "",
  agenda: "",
});

const hourRows = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

const formatMeetingDate = (date, time, timeFormat, timezone) =>
  new Date(`${date}T${time}`).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const formatTime = (time, timeFormat, timezone) =>
  new Date(`2026-04-08T${time}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const shellCard =
  "rounded-[26px] border border-[#dfe7f2] bg-white shadow-[0_18px_38px_rgba(27,44,74,0.06)]";

const CalendarView = ({
  focusedMeeting,
  meetings,
  setMeetings,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
}) => {
  const initialFocusedMeeting = focusedMeeting
    ? meetings.find((meeting) => meeting.id === focusedMeeting.meetingId)
    : null;
  const initialDate = initialFocusedMeeting?.date || focusedMeeting?.date || selectedDateKey;

  const [activeDate, setActiveDate] = useState(initialDate);
  const [form, setForm] = useState(
    initialFocusedMeeting
      ? {
          title: initialFocusedMeeting.title,
          date: initialFocusedMeeting.date,
          time: initialFocusedMeeting.time,
          attendees: initialFocusedMeeting.attendees,
          location: initialFocusedMeeting.location,
          agenda: initialFocusedMeeting.agenda,
        }
      : createEmptyForm(initialDate)
  );
  const [editingMeetingId, setEditingMeetingId] = useState(initialFocusedMeeting?.id || null);

  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (left, right) =>
          new Date(`${left.date}T${left.time}`) - new Date(`${right.date}T${right.time}`)
      ),
    [meetings]
  );

  const meetingsByDay = useMemo(
    () =>
      weekDays.reduce((accumulator, day) => {
        accumulator[day.key] = sortedMeetings.filter((meeting) => meeting.date === day.key);
        return accumulator;
      }, {}),
    [sortedMeetings]
  );

  const upcomingMeetings = sortedMeetings.filter((meeting) => meeting.date >= activeDate);
  const todaysMeetings = sortedMeetings.filter((meeting) => meeting.date === activeDate);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = (date = activeDate) => {
    setEditingMeetingId(null);
    setForm({
      ...createEmptyForm(date),
    });
  };

  const saveMeeting = () => {
    if (!form.title.trim() || !form.date || !form.time) {
      return;
    }

    const nextMeeting = {
      id: editingMeetingId || `meeting-${Date.now()}`,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      attendees: form.attendees.trim() || "Workspace team",
      location: form.location.trim() || "Location to be shared",
      agenda: form.agenda.trim() || "Agenda to be shared.",
    };

    setMeetings((current) => {
      const withoutEdited = editingMeetingId
        ? current.filter((meeting) => meeting.id !== editingMeetingId)
        : current;

      return [...withoutEdited, nextMeeting];
    });

    resetForm(form.date);
  };

  const editMeeting = (meeting) => {
    setEditingMeetingId(meeting.id);
    setForm({
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      attendees: meeting.attendees,
      location: meeting.location,
      agenda: meeting.agenda,
    });
  };

  const deleteMeeting = (meetingId) => {
    setMeetings((current) => current.filter((meeting) => meeting.id !== meetingId));
    if (editingMeetingId === meetingId) {
      resetForm(activeDate);
    }
  };

  return (
    <section className="calendar-view-shell flex-1 bg-[#fbfdff] p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className={`calendar-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Focus day
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">
            {new Date(`${activeDate}T00:00:00`).toLocaleDateString([], {
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className={`calendar-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Today
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">{todaysMeetings.length}</p>
          <p className="mt-1 text-sm text-[#73829a]">meetings on the selected day</p>
        </div>
        <div className={`calendar-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Upcoming
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">{upcomingMeetings.length}</p>
          <p className="mt-1 text-sm text-[#73829a]">scheduled sessions ahead</p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
                  Planner
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1a2a42]">
                  April 2026
                </h2>
              </div>

              <button
                onClick={() => {
                  setActiveDate(selectedDateKey);
                  resetForm(selectedDateKey);
                }}
                className="rounded-[14px] bg-[#2473c1] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,115,193,0.18)]"
              >
                Today
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((label) => (
                <span
                  key={label}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b9bb4]"
                >
                  {label}
                </span>
              ))}

              {miniCalendarDays.map((day, index) => {
                const dateValue = day ? `2026-04-${day.padStart(2, "0")}` : "";
                const isSelected = dateValue === activeDate;

                return (
                  <button
                    key={`${day || "empty"}-${index}`}
                    disabled={!day}
                    onClick={() => {
                      if (!dateValue) return;
                      setActiveDate(dateValue);
                      updateField("date", dateValue);
                    }}
                    className={`h-10 rounded-[12px] text-sm font-semibold transition ${
                      !day
                        ? "cursor-default bg-transparent"
                        : isSelected
                        ? "bg-[#2473c1] text-white"
                        : "bg-[#f7fafe] text-[#5c7191] hover:bg-[#eaf3fd]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Today
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold text-[#1a2a42]">
              Daily focus
            </h3>

            <div className="mt-5 space-y-3">
              {todaysMeetings.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7e0ee] bg-[#fbfdff] px-4 py-5 text-sm text-[#7b8aa4]">
                  No meetings planned for this day.
                </div>
              ) : (
                todaysMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-[18px] border border-[#e2eaf4] bg-[#f8fbff] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2574c4]">
                      {formatTime(meeting.time, timeFormat, timezone)}
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-[#1d2c45]">
                      {meeting.title}
                    </p>
                    <p className="mt-1 text-sm text-[#7585a0]">{meeting.attendees}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`calendar-shell-card ${shellCard} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
                Calendar
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[#1a2a42]">
                Week view
              </h2>
            </div>
            <span className="rounded-full bg-[#eaf3fd] px-4 py-2 text-sm font-semibold text-[#2574c4]">
              {sortedMeetings.length} meetings
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-[22px] border border-[#dfe7f2]">
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-[72px_repeat(5,minmax(0,1fr))]">
                <div className="bg-[#f9fbfe] p-3" />
              {weekDays.map((day) => (
                <button
                  key={day.key}
                  onClick={() => {
                    setActiveDate(day.key);
                    updateField("date", day.key);
                  }}
                  className={`border-b border-l border-[#dfe7f2] p-3 text-left transition ${
                    activeDate === day.key ? "bg-[#f3f8fe]" : "bg-[#f9fbfe]"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b9bb4]">
                    {day.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#1a2a42]">{day.day}</p>
                </button>
              ))}

              {hourRows.map((hour) => (
                <div key={hour} className="contents">
                  <div className="border-b border-[#dfe7f2] bg-[#f9fbfe] pr-3 pt-5 text-right text-[11px] font-semibold text-[#8b9bb4]">
                    {formatTime(hour, timeFormat, timezone)}
                  </div>

                  {weekDays.map((day) => {
                    const dayMeetings = meetingsByDay[day.key].filter(
                      (meeting) => meeting.time.slice(0, 2) === hour.slice(0, 2)
                    );

                    return (
                      <div
                        key={`${day.key}-${hour}`}
                        className={`min-h-[88px] border-b border-l border-[#dfe7f2] p-2.5 ${
                          activeDate === day.key ? "bg-[#fcfdff]" : "bg-white"
                        }`}
                      >
                        <div className="space-y-2">
                          {dayMeetings.map((meeting) => (
                            <button
                              key={meeting.id}
                              onClick={() => editMeeting(meeting)}
                              className="w-full rounded-[14px] bg-[#2473c1] px-3 py-2.5 text-left text-white shadow-[0_10px_18px_rgba(36,115,193,0.15)]"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
                                {formatTime(meeting.time, timeFormat, timezone)}
                              </p>
                              <p className="mt-1 line-clamp-2 text-sm font-semibold">
                                {meeting.title}
                              </p>
                              <p className="mt-1 text-xs text-white/80">{meeting.attendees}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Schedule meeting
            </p>
            <h2 className="mt-2 text-[1.65rem] font-semibold text-[#1a2a42]">
              {editingMeetingId ? "Edit session" : "Book a new session"}
            </h2>

            <div className="mt-5 grid gap-4">
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Meeting title"
                className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => updateField("time", event.target.value)}
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                />
              </div>

              <input
                value={form.attendees}
                onChange={(event) => updateField("attendees", event.target.value)}
                placeholder="Attendees"
                className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <input
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Location or meeting link"
                className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <textarea
                rows={4}
                value={form.agenda}
                onChange={(event) => updateField("agenda", event.target.value)}
                placeholder="Agenda"
                className="rounded-[20px] border border-[#d7e0ee] bg-[#f7fafe] px-4 py-4 text-[15px] leading-7 text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveMeeting}
                  className="rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)]"
                >
                  {editingMeetingId ? "Save changes" : "Schedule meeting"}
                </button>

                {editingMeetingId ? (
                  <button
                    onClick={() => resetForm(activeDate)}
                    className="rounded-[16px] border border-[#d7e0ee] bg-white px-5 py-3 text-sm font-semibold text-[#6b7b93]"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Upcoming meetings
            </p>
            <h2 className="mt-2 text-[1.65rem] font-semibold text-[#1a2a42]">
              Scheduled sessions
            </h2>

            <div className="mt-5 space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-[18px] border border-[#e2eaf4] bg-[#f8fbff] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-semibold text-[#1d2c45]">
                        {meeting.title}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#2574c4]">
                        {formatMeetingDate(meeting.date, meeting.time, timeFormat, timezone)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6c7c95]">
                      {meeting.attendees}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-[#5f7495]">{meeting.location}</p>
                  <p className="mt-2 text-sm leading-6 text-[#7585a0]">{meeting.agenda}</p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => editMeeting(meeting)}
                      className="rounded-[14px] border border-[#cfe0f4] bg-white px-4 py-2 text-sm font-semibold text-[#2473c1]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMeeting(meeting.id)}
                      className="rounded-[14px] border border-[#ead4d1] bg-white px-4 py-2 text-sm font-semibold text-[#b14a45]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalendarView;
