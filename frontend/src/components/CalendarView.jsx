import { useEffect, useMemo, useState } from "react";

const padDatePart = (value) => String(value).padStart(2, "0");

const getDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, offset) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const getWeekStart = (date) => {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
};

const buildWeekDays = (date) => {
  const weekStart = getWeekStart(date);
  return Array.from({ length: 5 }, (_, index) => {
    const current = addDays(weekStart, index);
    return {
      key: getDateKey(current),
      label: current.toLocaleDateString([], { weekday: "short" }),
      day: padDatePart(current.getDate()),
      isToday: getDateKey(current) === getDateKey(new Date()),
    };
  });
};

const buildMonthGrid = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const startIndex = firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const grid = [];

  for (let index = 0; index < startIndex; index += 1) {
    grid.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  return grid;
};

const createEmptyForm = (date = getDateKey(new Date())) => ({
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
  new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  });

const formatFullDate = (date, timezone) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);

const formatCurrentTime = (date, timeFormat, timezone) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat !== "24h",
    timeZone: timezone,
  }).format(date);

const shellCard =
  "rounded-[24px] border border-[#dfe7f2] bg-white shadow-[0_18px_38px_rgba(27,44,74,0.05)]";

const CalendarView = ({
  focusedMeeting,
  meetings,
  setMeetings,
  timeFormat = "12h",
  timezone = "Asia/Calcutta",
}) => {
  const todayKey = getDateKey(new Date());
  const initialFocusedMeeting = focusedMeeting
    ? meetings.find((meeting) => meeting.id === focusedMeeting.meetingId)
    : null;
  const initialDate = initialFocusedMeeting?.date || focusedMeeting?.date || todayKey;

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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!focusedMeeting) {
      return;
    }

    const nextMeeting = meetings.find((meeting) => meeting.id === focusedMeeting.meetingId);
    const nextDate = nextMeeting?.date || focusedMeeting.date;

    if (!nextDate) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setActiveDate((current) => (current === nextDate ? current : nextDate));
      setForm((current) => (current.date === nextDate ? current : { ...current, date: nextDate }));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [focusedMeeting, meetings]);

  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (left, right) =>
          new Date(`${left.date}T${left.time}`) - new Date(`${right.date}T${right.time}`)
      ),
    [meetings]
  );

  const currentDate = useMemo(() => new Date(`${activeDate}T00:00:00`), [activeDate]);
  const weekDays = useMemo(() => buildWeekDays(currentDate), [currentDate]);
  const monthGrid = useMemo(() => buildMonthGrid(currentDate), [currentDate]);

  const meetingsByDay = useMemo(
    () =>
      weekDays.reduce((accumulator, day) => {
        accumulator[day.key] = sortedMeetings.filter((meeting) => meeting.date === day.key);
        return accumulator;
      }, {}),
    [sortedMeetings, weekDays]
  );

  const upcomingMeetings = sortedMeetings.filter((meeting) => meeting.date >= todayKey);
  const todaysMeetings = sortedMeetings.filter((meeting) => meeting.date === activeDate);
  const currentWeekMeetings = sortedMeetings.filter((meeting) =>
    weekDays.some((day) => day.key === meeting.date)
  );
  const nextMeeting = upcomingMeetings[0] || null;
  const activeDateLabel = formatFullDate(currentDate, timezone);

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
    <section className="calendar-view-shell flex-1 bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fd_100%)] p-5 md:p-6">
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)_minmax(260px,0.8fr)]">
        <div className={`calendar-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Live now
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-[-0.03em] text-[#1a2a42]">
                {formatCurrentTime(now, timeFormat, timezone)}
              </p>
              <p className="mt-1 text-sm text-[#6f819d]">{formatFullDate(now, timezone)}</p>
            </div>
            <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#2473c1]">
              {timezone}
            </span>
          </div>
        </div>
        <div className={`calendar-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Selected day
          </p>
          <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1a2a42]">
            {todaysMeetings.length}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">{activeDateLabel}</p>
        </div>
        <div className={`calendar-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Next up
          </p>
          {nextMeeting ? (
            <>
              <p className="mt-3 text-lg font-semibold text-[#1a2a42]">{nextMeeting.title}</p>
              <p className="mt-1 text-sm text-[#73829a]">
                {formatMeetingDate(nextMeeting.date, nextMeeting.time, timeFormat, timezone)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#73829a]">No upcoming meetings scheduled.</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
                  Planner
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1a2a42]">
                  {currentDate.toLocaleDateString([], { month: "long", year: "numeric" })}
                </h2>
              </div>

              <button
                onClick={() => {
                  setActiveDate(todayKey);
                  resetForm(todayKey);
                }}
                className="rounded-[14px] bg-[#2473c1] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,115,193,0.16)]"
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

              {monthGrid.map((dateValue, index) => {
                const dateKey = dateValue ? getDateKey(dateValue) : "";
                const isSelected = dateKey === activeDate;
                const isToday = dateKey === todayKey;

                return (
                  <button
                    key={`${dateKey || "empty"}-${index}`}
                    disabled={!dateValue}
                    onClick={() => {
                      if (!dateKey) return;
                      setActiveDate(dateKey);
                      updateField("date", dateKey);
                    }}
                    className={`h-10 rounded-[12px] text-sm font-semibold transition ${
                      !dateValue
                        ? "cursor-default bg-transparent"
                        : isSelected
                        ? "bg-[#2473c1] text-white"
                        : isToday
                        ? "bg-[#eaf3fd] text-[#2473c1]"
                        : "bg-[#f7fafe] text-[#5c7191] hover:bg-[#eef4fb]"
                    }`}
                  >
                    {dateValue?.getDate() || ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`calendar-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Today
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.02em] text-[#1a2a42]">
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
                    className="rounded-[18px] border border-[#e2eaf4] bg-[linear-gradient(180deg,#fbfdff_0%,#f6faff_100%)] p-4"
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
              <h2 className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-[#1a2a42]">
                Week view
              </h2>
            </div>
            <span className="rounded-full bg-[#eaf3fd] px-4 py-2 text-sm font-semibold text-[#2574c4]">
              {currentWeekMeetings.length} this week
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
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xl font-semibold text-[#1a2a42]">{day.day}</p>
                    {day.isToday ? (
                      <span className="rounded-full bg-[#2473c1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                        Today
                      </span>
                    ) : null}
                  </div>
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
                          activeDate === day.key ? "bg-[#fbfdff]" : "bg-white"
                        }`}
                      >
                        <div className="space-y-2">
                          {dayMeetings.map((meeting) => (
                            <button
                              key={meeting.id}
                              onClick={() => editMeeting(meeting)}
                              className="w-full rounded-[16px] bg-[linear-gradient(180deg,#4d91d6_0%,#357bc4_100%)] px-3 py-3 text-left text-white shadow-[0_10px_20px_rgba(36,115,193,0.14)] transition hover:-translate-y-0.5"
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
            <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.02em] text-[#1a2a42]">
              {editingMeetingId ? "Edit session" : "Book a new session"}
            </h2>
            <p className="mt-2 text-sm text-[#73829a]">
              Keep meeting details short and clear so the schedule stays easy to scan.
            </p>

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
            <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.02em] text-[#1a2a42]">
              Scheduled sessions
            </h2>

            <div className="mt-5 space-y-3">
              {upcomingMeetings.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#d7e0ee] bg-[#fbfdff] px-4 py-5 text-sm text-[#7b8aa4]">
                  No meetings are scheduled yet.
                </div>
              ) : (
                upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-[18px] border border-[#e2eaf4] bg-[linear-gradient(180deg,#fbfdff_0%,#f6faff_100%)] p-4"
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalendarView;
