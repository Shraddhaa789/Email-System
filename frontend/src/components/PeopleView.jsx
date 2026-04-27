import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../config/api";

const DOMAIN = "@aksentt.co.in";
const ROLE_CARD_LIMIT = 4;

const hierarchyOrder = [
  { key: "avp", label: "AVP", matchers: ["avp", "assistant vice president", "associate vice president"] },
  { key: "manager", label: "Managers", matchers: ["manager", "project manager", "delivery manager"] },
  { key: "lead", label: "Team Leads", matchers: ["lead", "team lead", "technical lead", "tech lead"] },
  { key: "developer", label: "Developers", matchers: ["developer", "engineer", "frontend", "backend", "full stack", "software"] },
  { key: "operations", label: "Operations & Support", matchers: ["qa", "support", "hr", "ops", "operations", "analyst", "assistant", "coordinator", "administrator"] },
];

const shellCard =
  "rounded-[24px] border border-[#dfe7f2] bg-white shadow-[0_18px_38px_rgba(27,44,74,0.05)]";

const avatarTones = [
  "bg-[#eadffd] text-[#6a41a8]",
  "bg-[#dff0ff] text-[#2d6da3]",
  "bg-[#ffe4ef] text-[#a64d82]",
  "bg-[#e8f5df] text-[#54813f]",
  "bg-[#fff0cf] text-[#a56a12]",
  "bg-[#e5ebff] text-[#465ea8]",
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getAvatarTone = (value = "") => {
  const sum = value.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  return avatarTones[sum % avatarTones.length];
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const normalizeRole = (role = "") => role.trim() || "Team member";

const parseTimePart = (value) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minutes;
};

const getAvailability = (workingHours) => {
  const value = workingHours?.trim() || "9:00 AM - 6:00 PM";
  const parts = value.split("-").map((part) => part.trim());

  if (parts.length !== 2) {
    return {
      label: "Unavailable",
      detail: "Working hours not set",
      tone: "bg-[#eef3fa] text-[#69809f]",
    };
  }

  const startMinutes = parseTimePart(parts[0]);
  const endMinutes = parseTimePart(parts[1]);

  if (startMinutes === null || endMinutes === null) {
    return {
      label: "Unavailable",
      detail: "Working hours not set",
      tone: "bg-[#eef3fa] text-[#69809f]",
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return {
      label: "Available",
      detail: `Online until ${parts[1]}`,
      tone: "bg-[#e5f5eb] text-[#2f7b56]",
    };
  }

  if (currentMinutes < startMinutes) {
    return {
      label: "Offline",
      detail: `Available from ${parts[0]}`,
      tone: "bg-[#fff4d6] text-[#9b6b10]",
    };
  }

  return {
    label: "Offline",
    detail: `Available tomorrow from ${parts[0]}`,
    tone: "bg-[#eef3fa] text-[#69809f]",
  };
};

const getHierarchyKey = (role = "") => {
  const normalized = role.trim().toLowerCase();

  for (const level of hierarchyOrder) {
    if (level.matchers.some((matcher) => normalized.includes(matcher))) {
      return level.key;
    }
  }

  return "operations";
};

const buildRoleGroups = (members = []) =>
  Object.values(
    members.reduce((accumulator, member) => {
      const role = normalizeRole(member.role);

      if (!accumulator[role]) {
        accumulator[role] = {
          role,
          members: [],
        };
      }

      accumulator[role].members.push(member);
      return accumulator;
    }, {})
  )
    .map((group) => ({
      ...group,
      members: [...group.members].sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.role.localeCompare(right.role));

const detailsCard =
  "rounded-[22px] border border-[#dbe4f2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_18px_34px_rgba(27,44,74,0.06)]";

const TreePersonCard = ({ person, isActive, onSelect }) => {
  const availability = getAvailability(person.workingHours);

  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className={`min-w-[190px] max-w-[220px] rounded-[18px] border px-4 py-4 text-left transition ${
        isActive
          ? "border-[#b9d3f0] bg-[linear-gradient(180deg,#ffffff_0%,#f4f9ff_100%)] shadow-[0_14px_28px_rgba(27,44,74,0.08)]"
          : "border-[#e1e8f3] bg-white hover:-translate-y-0.5 hover:border-[#cfddf0] hover:shadow-[0_14px_28px_rgba(27,44,74,0.08)]"
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${getAvatarTone(
          person.email
        )}`}
      >
        {initials(person.name)}
      </div>
      <h4 className="mt-4 text-center text-[15px] font-semibold text-[#1d2c45]">{person.name}</h4>
      <p className="mt-1 text-center text-sm text-[#5f7495]">{normalizeRole(person.role)}</p>
      <p className="mt-1 text-center text-xs text-[#8a99b1]">{person.team || person.location || "Workspace"}</p>
      <div className="mt-3 flex justify-center">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${availability.tone}`}>
          {availability.label}
        </span>
      </div>
    </button>
  );
};

const PeopleView = () => {
  const currentUser = useMemo(() => getStoredUser(), []);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [expandedRoleGroups, setExpandedRoleGroups] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPeople = async () => {
      try {
        const response = await axios.get(buildApiUrl("/auth/directory"), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!isMounted) {
          return;
        }

        const directory = (Array.isArray(response.data) ? response.data : [])
          .filter((user) => user.accountRole !== "admin" && !user.deletedAt)
          .filter((user) => user.email?.toLowerCase().endsWith(DOMAIN))
          .map((user) => ({
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: normalizeRole(user.role),
            team: user.team || "",
            workingHours: user.workingHours || "9:00 AM - 6:00 PM",
            location: user.location || "Not shared",
          }));

        setPeople(directory);
      } catch {
        if (isMounted) {
          setPeople([]);
          setSelectedPersonId(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPeople();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId) || null,
    [people, selectedPersonId]
  );

  const selectedAvailability = selectedPerson
    ? getAvailability(selectedPerson.workingHours)
    : null;

  const treeLevels = useMemo(
    () =>
      hierarchyOrder
        .map((level) => {
          const members = people
            .filter((person) => getHierarchyKey(person.role) === level.key)
            .sort((left, right) => left.name.localeCompare(right.name));

          return {
            ...level,
            members,
            roleGroups: buildRoleGroups(members),
          };
        })
        .filter((level) => level.members.length > 0),
    [people]
  );

  const toggleRoleGroup = (groupKey) => {
    setExpandedRoleGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  };

  return (
    <section className="people-view-shell flex-1 bg-[linear-gradient(180deg,#f8fbff_0%,#f5f8fd_100%)] p-5 md:p-6">
      <div className={`people-shell-card ${shellCard} overflow-hidden p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              Organization tree
            </p>
            {/* <p className="mt-2 text-sm text-[#73829a]">
              Click any person to open their details. Same designations stay grouped in one branch.
            </p> */}
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#69809f]">
                Loading
              </span>
            ) : null}
            <span className="rounded-full bg-[#f4f7fb] px-3 py-1 text-xs font-semibold text-[#69809f]">
              {people.length} people
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            {treeLevels.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[#d7e0ee] bg-[#fbfdff] px-6 py-10 text-center text-sm text-[#8190a8]">
                No Aksentt directory users are available yet.
              </div>
            ) : (
              <div className="mx-auto max-w-[980px]">
                {treeLevels.map((level, levelIndex) => (
                  <div key={level.key} className="relative flex flex-col items-center">
                    {levelIndex > 0 ? (
                      <div className="h-8 w-px bg-[#d5dfec]" />
                    ) : null}

                    <div className="rounded-full border border-[#d7e0ee] bg-white px-5 py-2 text-sm font-semibold text-[#425978] shadow-[0_10px_22px_rgba(27,44,74,0.05)]">
                      {level.label}
                    </div>

                    {level.roleGroups.map((group) => {
                      const groupKey = `${level.key}:${group.role}`;
                      const isExpanded = Boolean(expandedRoleGroups[groupKey]);
                      const visibleMembers = isExpanded
                        ? group.members
                        : group.members.slice(0, ROLE_CARD_LIMIT);
                      return (
                        <div key={groupKey} className="flex w-full flex-col items-center">
                          <div className="h-6 w-px bg-[#d5dfec]" />

                          <div className="w-full px-2">
                            <div className="mx-auto hidden h-px max-w-[760px] bg-[#d5dfec] md:block" />
                            <div className="flex flex-wrap justify-center gap-4 md:-mt-px">
                              {visibleMembers.map((person) => (
                                <div key={person.id} className="flex flex-col items-center">
                                  <div className="hidden h-5 w-px bg-[#d5dfec] md:block" />
                                  <TreePersonCard
                                    person={person}
                                    isActive={selectedPerson?.id === person.id}
                                    onSelect={setSelectedPersonId}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {group.members.length > ROLE_CARD_LIMIT ? (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => toggleRoleGroup(groupKey)}
                                className="rounded-full border border-[#d7e0ee] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f7495]"
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            {selectedPerson ? (
              <div className={detailsCard}>
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#e4ebf5] pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b9bb4]">
                      Person details
                    </p>
                    <p className="mt-1 text-sm text-[#73829a]">
                      Selected from the tree.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPersonId(null)}
                    className="rounded-full border border-[#d7e0ee] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f7495]"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] text-[1.7rem] font-semibold ${getAvatarTone(
                      selectedPerson.email
                    )}`}
                  >
                    {initials(selectedPerson.name)}
                  </div>
                  <div>
                    <h3 className="text-[1.5rem] font-semibold text-[#1d2c45]">
                      {selectedPerson.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#5f7495]">{selectedPerson.role}</p>
                    {selectedPerson.team ? (
                      <p className="mt-1 text-sm text-[#7b8ca4]">{selectedPerson.team}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedAvailability?.tone || "bg-[#eef3fa] text-[#69809f]"
                        }`}
                      >
                        {selectedAvailability?.detail || "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-[#314763]">
                  <div className="rounded-[16px] border border-[#e4ebf5] bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b9bb4]">
                      Mail
                    </p>
                    <p className="mt-1 font-medium break-all text-[#2574c4]">{selectedPerson.email}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#e4ebf5] bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b9bb4]">
                      Working hours
                    </p>
                    <p className="mt-1">{selectedPerson.workingHours || "9:00 AM - 6:00 PM"}</p>
                  </div>
                  <div className="rounded-[16px] border border-[#e4ebf5] bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b9bb4]">
                      Location
                    </p>
                    <p className="mt-1">{selectedPerson.location || "Not shared"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={detailsCard}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b9bb4]">
                  Person details
                </p>
                <p className="mt-3 text-sm leading-6 text-[#73829a]">
                  Click any person in the tree to open their profile here on the right side.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default PeopleView;
