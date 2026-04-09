import { useMemo, useState } from "react";

const todayKey = "2026-04-08";

const initialTasks = [
  {
    id: "task-1",
    title: "Tighten mobile reading pane spacing",
    owner: "Design",
    dueDate: "2026-04-08",
    priority: "High",
    status: "Completed",
    checklist: [
      { id: "c-1", label: "Review desktop spacing", complete: true },
      { id: "c-2", label: "Adjust mobile padding", complete: true },
      { id: "c-3", label: "QA on small screens", complete: true },
    ],
  },
  {
    id: "task-2",
    title: "Make unread state more visible",
    owner: "Frontend",
    dueDate: "2026-04-08",
    priority: "High",
    status: "In Progress",
    checklist: [
      { id: "c-4", label: "Add unread tint", complete: true },
      { id: "c-5", label: "Mark read on open", complete: false },
    ],
  },
  {
    id: "task-3",
    title: "Add archive quick action in preview header",
    owner: "Frontend",
    dueDate: "2026-04-09",
    priority: "Medium",
    status: "Not Started",
    checklist: [
      { id: "c-6", label: "Place action in toolbar", complete: false },
      { id: "c-7", label: "Verify archive refresh", complete: false },
    ],
  },
  {
    id: "task-4",
    title: "Review sent, drafts, archive QA pass",
    owner: "Product",
    dueDate: "2026-04-10",
    priority: "Medium",
    status: "In Progress",
    checklist: [
      { id: "c-8", label: "Check sent flow", complete: true },
      { id: "c-9", label: "Check drafts flow", complete: false },
      { id: "c-10", label: "Check archive flow", complete: false },
    ],
  },
];

const emptyForm = {
  title: "",
  owner: "Workspace",
  dueDate: todayKey,
  priority: "Medium",
  status: "Not Started",
  checklistText: "",
};

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

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });

const getGrouping = (task) => {
  if (task.status === "Completed") {
    return "completed";
  }

  if (task.dueDate <= todayKey) {
    return "today";
  }

  return "upcoming";
};

const sectionMeta = {
  today: {
    label: "Today",
    note: "Items that need attention right away.",
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

const shellCard =
  "rounded-[26px] border border-[#dfe7f2] bg-white shadow-[0_18px_38px_rgba(27,44,74,0.06)]";

const TasksView = () => {
  const [tasks, setTasks] = useState(initialTasks);
  const [form, setForm] = useState(emptyForm);

  const groupedTasks = useMemo(
    () =>
      tasks.reduce(
        (accumulator, task) => {
          accumulator[getGrouping(task)].push(task);
          return accumulator;
        },
        { today: [], upcoming: [], completed: [] }
      ),
    [tasks]
  );

  const summary = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.status === "Completed").length;
    const totalChecklist = tasks.flatMap((task) => task.checklist).length;
    const completedChecklist = tasks
      .flatMap((task) => task.checklist)
      .filter((item) => item.complete).length;

    return {
      todayCount: groupedTasks.today.length,
      upcomingCount: groupedTasks.upcoming.length,
      completedTasks,
      totalTasks: tasks.length,
      completedChecklist,
      totalChecklist,
    };
  }, [groupedTasks, tasks]);

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
    setForm(emptyForm);
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
                item.id === checklistId
                  ? { ...item, complete: !item.complete }
                  : item
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
    <section className="tasks-view-shell flex-1 bg-[#fbfdff] p-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className={`tasks-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Today
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">{summary.todayCount}</p>
          <p className="mt-1 text-sm text-[#73829a]">tasks needing attention</p>
        </div>
        <div className={`tasks-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Upcoming
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">{summary.upcomingCount}</p>
          <p className="mt-1 text-sm text-[#73829a]">planned next steps</p>
        </div>
        <div className={`tasks-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Completed
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">
            {summary.completedTasks}/{summary.totalTasks}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">finished delivery items</p>
        </div>
        <div className={`tasks-shell-card ${shellCard} px-5 py-4`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b9bb4]">
            Checklist
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#1a2a42]">
            {summary.completedChecklist}/{summary.totalChecklist}
          </p>
          <p className="mt-1 text-sm text-[#73829a]">sub-steps completed</p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className={`tasks-shell-card ${shellCard} p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Add Task
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold text-[#1a2a42]">
              Create a new delivery item
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#73829a]">
              Keep this panel lightweight: title, owner, due date, and a short delivery checklist.
            </p>

            <div className="mt-5 grid gap-4">
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Task title"
                className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <div className="grid gap-4 md:grid-cols-2">
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

              <div className="grid gap-4 md:grid-cols-2">
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
                placeholder={"Delivery checklist items, one per line\nReview copy\nQA mailbox flows\nShare final build"}
                className="rounded-[20px] border border-[#d7e0ee] bg-[#f7fafe] px-4 py-4 text-[15px] leading-7 text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              />

              <button
                onClick={addTask}
                className="inline-flex w-fit items-center rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)]"
              >
                Create task
              </button>
            </div>
          </div>
        </div>

        <div className={`tasks-shell-card ${shellCard} p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
            Tasks
          </p>
          <h2 className="mt-2 text-[1.8rem] font-semibold text-[#1a2a42]">
            Delivery board
          </h2>

          <div className="mt-5 space-y-6">
            {Object.entries(sectionMeta).map(([sectionKey, meta]) => (
              <div key={sectionKey}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-[20px] font-semibold text-[#1d2c45]">
                      {meta.label}
                    </h3>
                    <p className="mt-1 text-sm text-[#7585a0]">{meta.note}</p>
                  </div>
                  <span className="rounded-full bg-[#eef3fa] px-3 py-1 text-xs font-semibold text-[#69809f]">
                    {groupedTasks[sectionKey].length}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {groupedTasks[sectionKey].length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-[#d7e0ee] bg-[#fbfdff] px-5 py-6 text-sm text-[#8190a8]">
                      No tasks in this section yet.
                    </div>
                  ) : (
                    groupedTasks[sectionKey].map((task) => (
                      <div
                        key={task.id}
                        className="task-item-card rounded-[22px] border border-[#e1e8f3] bg-[#fbfdff] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-[17px] font-semibold text-[#1d2c45]">
                              {task.title}
                            </h4>
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
                              Delete task
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_140px_160px]">
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(event) =>
                              updateTask(task.id, "dueDate", event.target.value)
                            }
                            className="h-11 rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none focus:border-[#8fb9e1]"
                          />
                          <select
                            value={task.priority}
                            onChange={(event) =>
                              updateTask(task.id, "priority", event.target.value)
                            }
                            className="h-11 rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-sm text-[#21314d] outline-none focus:border-[#8fb9e1]"
                          >
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                          <select
                            value={task.status}
                            onChange={(event) =>
                              updateTask(task.id, "status", event.target.value)
                            }
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
                              Delivery checklist
                            </p>
                            <span className="text-xs font-semibold text-[#69809f]">
                              {task.checklist.filter((item) => item.complete).length}/
                              {task.checklist.length}
                            </span>
                          </div>

                          <div className="mt-3 space-y-3">
                            {task.checklist.length === 0 ? (
                              <p className="text-sm text-[#8190a8]">
                                No checklist items yet.
                              </p>
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
