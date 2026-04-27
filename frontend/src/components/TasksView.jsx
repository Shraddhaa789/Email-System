import { useEffect, useMemo, useState } from "react";

const padDatePart = (value) => String(value).padStart(2, "0");

const getDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const addDays = (date, offset) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};

const today = new Date();
const todayKey = getDateKey(today);

const initialTasks = [
  {
    id: "task-1",
    title: "Polish reading pane spacing",
    owner: "Design",
    dueDate: todayKey,
    priority: "High",
    status: "Completed",
    checklist: [
      { id: "c-1", label: "Review desktop spacing", complete: true },
      { id: "c-2", label: "Adjust tablet padding", complete: true },
      { id: "c-3", label: "Sign off visual QA", complete: true },
    ],
  },
  {
    id: "task-2",
    title: "Improve unread state clarity",
    owner: "Frontend",
    dueDate: todayKey,
    priority: "High",
    status: "In Progress",
    checklist: [
      { id: "c-4", label: "Strengthen unread tint", complete: true },
      { id: "c-5", label: "Refine subject weight", complete: false },
    ],
  },
  {
    id: "task-3",
    title: "Review Sent and Drafts flows",
    owner: "Product",
    dueDate: getDateKey(addDays(today, 1)),
    priority: "Medium",
    status: "Not Started",
    checklist: [
      { id: "c-6", label: "Review compose entry point", complete: false },
      { id: "c-7", label: "Check folder-specific labels", complete: false },
    ],
  },
  {
    id: "task-4",
    title: "Final pass on calendar experience",
    owner: "Frontend",
    dueDate: getDateKey(addDays(today, 2)),
    priority: "Medium",
    status: "In Progress",
    checklist: [
      { id: "c-8", label: "Verify live date logic", complete: true },
      { id: "c-9", label: "Tidy responsive spacing", complete: false },
      { id: "c-10", label: "Check visual hierarchy", complete: false },
    ],
  },
];

const createEmptyForm = (date = todayKey) => ({
  title: "",
  owner: "Workspace",
  dueDate: date,
  priority: "Medium",
  status: "Not Started",
  checklistText: "",
});

const priorityStyles = {
  High: "bg-[#ffe5e0] text-[#b94d3e]",
  Medium: "bg-[#fff4d6] text-[#9b6b10]",
  Low: "bg-[#e4f5ea] text-[#2f7b56]",
};

const statusStyles = {
  "Not Started": "bg-[#eef3fa] text-[#69809f]",
  "In Progress": "bg-[#e7f0fc] text-[#2f6eb4]",
  Completed: "bg-[#e5f5eb] text-[#2f7b56]",
};

const shellCard =
  "rounded-[24px] border border-[#dfe7f2] bg-white shadow-[0_18px_38px_rgba(27,44,74,0.05)]";

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

const formatLongDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatClock = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);

const getGrouping = (task, currentTodayKey) => {
  if (task.status === "Completed") {
    return "completed";
  }

  if (task.dueDate < currentTodayKey) {
    return "overdue";
  }

  if (task.dueDate === currentTodayKey) {
    return "today";
  }

  return "upcoming";
};

const sectionMeta = {
  overdue: {
    label: "Overdue",
    note: "Items that slipped past their due date.",
  },
  today: {
    label: "Today",
    note: "Priority work that should move now.",
  },
  upcoming: {
    label: "Upcoming",
    note: "Planned work lined up next.",
  },
  completed: {
    label: "Completed",
    note: "Finished work ready for review.",
  },
};

const getTaskHealth = (task, currentTodayKey) => {
  if (task.status === "Completed") {
    return "Done";
  }

  if (task.dueDate < currentTodayKey) {
    return "Overdue";
  }

  if (task.dueDate === currentTodayKey) {
    return "Due today";
  }

  return "Scheduled";
};

const TasksView = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState(() => createEmptyForm());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const liveTodayKey = getDateKey(now);

  const groupedTasks = useMemo(
    () =>
      tasks.reduce(
        (accumulator, task) => {
          accumulator[getGrouping(task, liveTodayKey)].push(task);
          return accumulator;
        },
        { overdue: [], today: [], upcoming: [], completed: [] }
      ),
    [liveTodayKey, tasks]
  );

  const summary = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.status === "Completed").length;
    const totalChecklist = tasks.flatMap((task) => task.checklist).length;
    const completedChecklist = tasks
      .flatMap((task) => task.checklist)
      .filter((item) => item.complete).length;

    return {
      overdueCount: groupedTasks.overdue.length,
      todayCount: groupedTasks.today.length,
      upcomingCount: groupedTasks.upcoming.length,
      completedTasks,
      totalTasks: tasks.length,
      completedChecklist,
      totalChecklist,
    };
  }, [groupedTasks, tasks]);

  const nextDueTask = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status !== "Completed")
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate))[0] || null,
    [tasks]
  );

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addTask = () => {
    if (!form.title.trim()) {
      return;
    }

    const checklist = form.checklistText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({
        id: `new-check-${Date.now()}-${index}`,
        label,
        complete: false,
      }));

    const newTask = {
      id: `task-${Date.now()}`,
      title: form.title.trim(),
      owner: form.owner.trim() || "Workspace",
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      checklist,
    };

    setTasks((current) => [newTask, ...current]);
    setForm(createEmptyForm(liveTodayKey));
  };

  const updateTask = (taskId, key, value) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              [key]: value,
            }
          : task
      )
    );
  };

  const toggleChecklist = (taskId, checklistId) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map((item) =>
                item.id === checklistId ? { ...item, complete: !item.complete } : item
              ),
            }
          : task
      )
    );
  };

  const deleteTask = (taskId) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  return (
    <section className="tasks-view-shell flex-1 bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fd_100%)] p-5 md:p-6">
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.8fr))]">
        <div className={`tasks-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Workday
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-[-0.03em] text-[#1a2a42]">
                {formatClock(now)}
              </p>
              <p className="mt-1 text-sm text-[#73829a]">{formatLongDate(liveTodayKey)}</p>
            </div>
            <span className="rounded-full bg-[#edf5ff] px-3 py-1 text-xs font-semibold text-[#2473c1]">
              Live task board
            </span>
          </div>
        </div>

        <div className={`tasks-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Overdue
          </p>
          <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1a2a42]">
            {summary.overdueCount}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">need immediate follow-up</p>
        </div>

        <div className={`tasks-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Today
          </p>
          <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1a2a42]">
            {summary.todayCount}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">active delivery items</p>
        </div>

        <div className={`tasks-shell-card ${shellCard} px-5 py-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Progress
          </p>
          <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1a2a42]">
            {summary.completedTasks}/{summary.totalTasks}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">
            {summary.completedChecklist}/{summary.totalChecklist} checklist items done
          </p>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className={`tasks-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Quick add
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.02em] text-[#1a2a42]">
              Create a task
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#73829a]">
              Keep tasks concise, set the due date, and add only the checklist items that matter.
            </p>

            <div className="mt-5 grid gap-4">
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Task title"
                className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
                <input
                  value={form.owner}
                  onChange={(event) => updateForm("owner", event.target.value)}
                  placeholder="Owner"
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                />
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateForm("dueDate", event.target.value)}
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-1">
                <select
                  value={form.priority}
                  onChange={(event) => updateForm("priority", event.target.value)}
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>

                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                >
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>

              <textarea
                value={form.checklistText}
                onChange={(event) => updateForm("checklistText", event.target.value)}
                rows={5}
                placeholder={"Checklist items, one per line\nReview UI polish\nVerify date logic\nShare update"}
                className="rounded-[20px] border border-[#d7e0ee] bg-[#f7fafe] px-4 py-4 text-[15px] leading-7 text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <button
                onClick={addTask}
                className="inline-flex w-fit items-center rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.22)]"
              >
                Add task
              </button>
            </div>
          </div>

          <div className={`tasks-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Next due
            </p>
            <h3 className="mt-2 text-[1.4rem] font-semibold tracking-[-0.02em] text-[#1a2a42]">
              {nextDueTask ? nextDueTask.title : "All clear"}
            </h3>
            <p className="mt-2 text-sm text-[#73829a]">
              {nextDueTask
                ? `${nextDueTask.owner} | Due ${formatDate(nextDueTask.dueDate)}`
                : "No pending tasks are waiting right now."}
            </p>
          </div>
        </div>

        <div className={`tasks-shell-card ${shellCard} p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
                Task board
              </p>
              <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-[#1a2a42]">
                Delivery workflow
              </h2>
            </div>
            <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#69809f]">
              {tasks.length} tasks in view
            </span>
          </div>

          <div className="mt-5 space-y-6">
            {Object.entries(sectionMeta).map(([sectionKey, meta]) => (
              <div key={sectionKey}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-[20px] font-semibold text-[#1d2c45]">{meta.label}</h3>
                    <p className="mt-1 text-sm text-[#7585a0]">{meta.note}</p>
                  </div>
                  <span className="rounded-full bg-[#eef3fa] px-3 py-1 text-xs font-semibold text-[#69809f]">
                    {groupedTasks[sectionKey].length}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {groupedTasks[sectionKey].length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-[#d7e0ee] bg-[#fbfdff] px-5 py-6 text-sm text-[#8190a8]">
                      No tasks in this section right now.
                    </div>
                  ) : (
                    groupedTasks[sectionKey].map((task) => (
                      <div
                        key={task.id}
                        className="task-item-card rounded-[22px] border border-[#e1e8f3] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-[17px] font-semibold text-[#1d2c45]">
                                {task.title}
                              </h4>
                              <span className="rounded-full bg-[#f3f7fb] px-2.5 py-1 text-[11px] font-semibold text-[#67809e]">
                                {getTaskHealth(task, liveTodayKey)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#7585a0]">{task.owner}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                            >
                              {task.status}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6c7c95]">
                              Due {formatDate(task.dueDate)}
                            </span>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="rounded-full border border-[#ead4d1] bg-white px-3 py-1 text-xs font-semibold text-[#b14a45] transition hover:bg-[#fff3f1]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_150px_170px]">
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(event) => updateTask(task.id, "dueDate", event.target.value)}
                            className="h-11 rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none focus:border-[#8fb9e1]"
                          />
                          <select
                            value={task.priority}
                            onChange={(event) => updateTask(task.id, "priority", event.target.value)}
                            className="h-11 rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none focus:border-[#8fb9e1]"
                          >
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                          <select
                            value={task.status}
                            onChange={(event) => updateTask(task.id, "status", event.target.value)}
                            className="h-11 rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none focus:border-[#8fb9e1]"
                          >
                            <option>Not Started</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </div>

                        <div className="task-checklist-card mt-4 rounded-[18px] border border-[#e1e8f3] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b9bb4]">
                              Checklist
                            </p>
                            <span className="text-xs font-semibold text-[#69809f]">
                              {task.checklist.filter((item) => item.complete).length}/{task.checklist.length}
                            </span>
                          </div>

                          <div className="mt-3 space-y-3">
                            {task.checklist.length === 0 ? (
                              <p className="text-sm text-[#8190a8]">No checklist items yet.</p>
                            ) : (
                              task.checklist.map((item) => (
                                <label
                                  key={item.id}
                                  className="flex items-center gap-3 rounded-[14px] border border-[#edf2f8] bg-[#f8fbff] px-3 py-3"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.complete}
                                    onChange={() => toggleChecklist(task.id, item.id)}
                                    className="h-4 w-4 rounded border-[#bfd0e5] text-[#2473c1] focus:ring-[#2473c1]"
                                  />
                                  <span
                                    className={`text-sm ${
                                      item.complete
                                        ? "text-[#7a8aa3] line-through"
                                        : "text-[#2a3e59]"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TasksView;
