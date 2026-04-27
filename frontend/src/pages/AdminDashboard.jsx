import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../config/api";

const API_URL = buildApiUrl("/admin");
const NAV = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "groups", label: "Teams & Groups" },
  { key: "roles", label: "Roles" },
  { key: "support", label: "Support" },
  { key: "settings", label: "Settings" },
];
const USER_TABS = [
  ["active", "Active users"],
  ["contacts", "Contacts"],
  ["guest", "Guest users"],
  ["deleted", "Deleted users"],
];
const SETTINGS_TABS = [
  ["domains", "Mail domain settings"],
  ["privacy", "Privacy & security"],
  ["attachments", "Attachment limit"],
];
const emptyUser = {
  name: "",
  emailLocalPart: "",
  password: "",
  role: "",
  team: "",
  workingHours: "",
  location: "",
  userType: "member",
};
const emptyGroup = { name: "", description: "", memberIds: [] };
const emptyDomain = { domain: "" };
const emptySecurityForm = {
  name: "",
  currentPassword: "",
  newPassword: "",
};
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const MERIDIEM_OPTIONS = ["AM", "PM"];

const inferMeridiem = (hour) => {
  if (hour >= 8 && hour <= 11) {
    return "AM";
  }

  return "PM";
};

const normalizeTimeToken = (value = "") => {
  const trimmed = value.trim().toUpperCase().replace(/\./g, ":").replace(/\s+/g, " ");
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);

  if (!match) {
    return "";
  }

  const [, rawHour, rawMinutes = "00", meridiem] = match;
  const hour = Number(rawHour);
  const minutes = rawMinutes === "30" ? "30" : "00";

  if (!Number.isFinite(hour) || hour < 1 || hour > 12) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${minutes} ${meridiem || inferMeridiem(hour)}`;
};

const parseWorkingHours = (value = "") => {
  const match = value.match(/(.+?)\s+to\s+(.+)/i);

  if (!match) {
    return { start: "", end: "" };
  }

  return {
    start: normalizeTimeToken(match[1]),
    end: normalizeTimeToken(match[2]),
  };
};

const buildWorkingHours = (start, end) => {
  if (!start || !end) {
    return "";
  }

  return `${start} to ${end}`;
};

const splitTimeParts = (value = "") => {
  const normalized = normalizeTimeToken(value);
  const match = normalized.match(/^(\d{2}):(\d{2}) (AM|PM)$/);

  if (!match) {
    return { hour: "09", minute: "00", meridiem: "AM" };
  }

  return {
    hour: match[1],
    minute: match[2],
    meridiem: match[3],
  };
};

const buildTimeFromParts = ({ hour, minute, meridiem }) => `${hour}:${minute} ${meridiem}`;

const TimeWheelColumn = ({ options, selectedValue, onSelect, ariaLabel, widthClass = "w-[88px]" }) => {
  const listRef = useRef(null);

  useEffect(() => {
    const listElement = listRef.current;
    const activeButton = listElement?.querySelector(`[data-option="${selectedValue}"]`);

    if (!listElement || !activeButton) {
      return;
    }

    const nextTop =
      activeButton.offsetTop - listElement.clientHeight / 2 + activeButton.clientHeight / 2;

    listElement.scrollTo({
      top: Math.max(nextTop, 0),
      behavior: "smooth",
    });
  }, [selectedValue]);

  return (
    <div className={`relative h-36 ${widthClass} overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]`}>
      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-11 -translate-y-1/2 rounded-[14px] border border-[#c7d8ee] bg-white shadow-[0_8px_18px_rgba(36,115,193,0.08)]" />
      <div
        ref={listRef}
        className="h-full snap-y snap-mandatory overflow-y-auto py-[48px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-option={option}
            aria-label={`${ariaLabel} ${option}`}
            onClick={() => onSelect(option)}
            className={`relative z-20 flex h-10 w-full snap-center items-center justify-center text-[1.35rem] font-semibold leading-none transition ${
              selectedValue === option ? "text-[#223754]" : "text-[#5f718b]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

const WorkingHoursWheelPicker = ({ label, value, helperLabel, onChange, isOpen, onToggle }) => {
  const timeParts = useMemo(() => splitTimeParts(value), [value]);

  const updatePart = (key, nextValue) => {
    onChange(buildTimeFromParts({ ...timeParts, [key]: nextValue }));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-12 w-full items-center justify-between rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none transition hover:bg-white focus:border-[#8fb9e1]"
      >
        <span>{value || label}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f8ea6]">{helperLabel}</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 min-w-[272px] rounded-[24px] border border-[#d7e0ee] bg-white p-3 shadow-[0_18px_40px_rgba(16,35,63,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#314763]">{label}</p>
            <p className="text-sm font-medium text-[#6b7b93]">{value || "09:00 AM"}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <TimeWheelColumn widthClass="w-[62px]" options={HOUR_OPTIONS} selectedValue={timeParts.hour} onSelect={(nextValue) => updatePart("hour", nextValue)} ariaLabel={`${label} hour`} />
            <div className="text-[1.5rem] font-semibold text-[#314763]">:</div>
            <TimeWheelColumn widthClass="w-[62px]" options={MINUTE_OPTIONS} selectedValue={timeParts.minute} onSelect={(nextValue) => updatePart("minute", nextValue)} ariaLabel={`${label} minute`} />
            <TimeWheelColumn widthClass="w-[68px]" options={MERIDIEM_OPTIONS} selectedValue={timeParts.meridiem} onSelect={(nextValue) => updatePart("meridiem", nextValue)} ariaLabel={`${label} meridiem`} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ThemeIcon = ({ theme }) =>
  theme === "dark" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.7 8.7 0 1 0 10.2 10.2z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.3" /><path d="M12 19.2v2.3" /><path d="M4.9 4.9l1.6 1.6" /><path d="M17.5 17.5l1.6 1.6" /><path d="M2.5 12h2.3" /><path d="M19.2 12h2.3" /><path d="M4.9 19.1l1.6-1.6" /><path d="M17.5 6.5l1.6-1.6" /></svg>
  );

const initials = (v = "") => v.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
const daysLeft = (v) => (v ? Math.max(0, 30 - Math.floor((Date.now() - new Date(v).getTime()) / 86400000)) : 0);

function AdminDashboard({ onToggleTheme, theme }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [domains, setDomains] = useState([]);
  const [section, setSection] = useState("overview");
  const [userTab, setUserTab] = useState("active");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [userForm, setUserForm] = useState(emptyUser);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [domainForm, setDomainForm] = useState(emptyDomain);
  const [settingsTab, setSettingsTab] = useState("domains");
  const [securityForm, setSecurityForm] = useState(emptySecurityForm);
  const [attachmentLimitMb, setAttachmentLimitMb] = useState("100");
  const [userDomain, setUserDomain] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingAttachmentLimit, setSavingAttachmentLimit] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [workingHoursStart, setWorkingHoursStart] = useState("");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("");
  const [activeWorkingHoursPicker, setActiveWorkingHoursPicker] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const requestConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, u, g, d] = await Promise.all([
        axios.get(`${API_URL}/overview`, requestConfig),
        axios.get(`${API_URL}/users`, requestConfig),
        axios.get(`${API_URL}/groups`, requestConfig),
        axios.get(`${API_URL}/domains`, requestConfig),
      ]);
      setOverview(o.data);
      setUsers(u.data);
      setGroups(g.data);
      setDomains(d.data);

      const [profileResponse, preferencesResponse] = await Promise.all([
        axios.get(buildApiUrl("/auth/me"), requestConfig),
        axios.get(`${API_URL}/preferences`, requestConfig),
      ]);

      const currentProfile = profileResponse.data?.user || {};
      setSecurityForm({
        name: currentProfile.name || "",
        currentPassword: "",
        newPassword: "",
      });
      setAttachmentLimitMb(String(preferencesResponse.data?.attachmentLimitMb || 50));
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [requestConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeUsers = users.filter((u) => u.accountRole !== "admin" && !u.deletedAt && u.userType !== "guest");
  const contactUsers = users.filter((u) => u.accountRole !== "admin" && !u.deletedAt);
  const guestUsers = users.filter((u) => u.accountRole !== "admin" && !u.deletedAt && u.userType === "guest");
  const deletedUsers = users.filter((u) => u.accountRole !== "admin" && u.deletedAt);
  const groupUsers = users.filter((u) => u.accountRole !== "admin" && !u.deletedAt);
  const filteredGroupUsers = groupUsers.filter((user) => {
    const search = groupMemberSearch.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return [user.name, user.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
  const activeRoleUsers = users.filter((u) => u.accountRole !== "admin" && !u.deletedAt && u.userType !== "guest");
  const baseVisibleUsers = userTab === "active" ? activeUsers : userTab === "contacts" ? contactUsers : userTab === "guest" ? guestUsers : deletedUsers;
  const roleFilterOptions = [...new Set(baseVisibleUsers.map((u) => (u.role || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const roleSummary = useMemo(
    () =>
      [...new Set(activeRoleUsers.map((user) => (user.role || "").trim()).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
        .map((role) => {
          const roleUsers = activeRoleUsers.filter((user) => (user.role || "").trim() === role);
          const teams = [...new Set(roleUsers.map((user) => (user.team || "").trim()).filter(Boolean))];

          return {
            name: role,
            count: roleUsers.length,
            teams,
            users: roleUsers,
          };
        })
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    [activeRoleUsers]
  );
  const activeRoleDetail = roleSummary.find((role) => role.name === selectedRole) || roleSummary[0] || null;
  const visibleUsers = baseVisibleUsers.filter((u) => {
    const search = userSearch.trim().toLowerCase();
    const matchesSearch = !search || [
      u.name,
      u.email,
      u.role,
      u.team,
      u.location,
      u.workingHours,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);

    const matchesFilter =
      !userFilter ||
      (u.role || "").trim().toLowerCase() === userFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (roleSummary.length === 0) {
      if (selectedRole) {
        setSelectedRole("");
      }
      return;
    }

    if (!selectedRole || !roleSummary.some((role) => role.name === selectedRole)) {
      setSelectedRole(roleSummary[0].name);
    }
  }, [roleSummary, selectedRole]);

  const setUserField = (k, v) => setUserForm((c) => ({ ...c, [k]: v }));
  const setGroupField = (k, v) => setGroupForm((c) => ({ ...c, [k]: v }));
  const setSecurityField = (k, v) => setSecurityForm((c) => ({ ...c, [k]: v }));
  const resetUser = () => { setUserForm(emptyUser); setUserDomain(""); setEditingUserId(null); setWorkingHoursStart(""); setWorkingHoursEnd(""); setActiveWorkingHoursPicker(null); };
  const resetGroup = () => { setGroupForm(emptyGroup); setEditingGroupId(null); setGroupMemberSearch(""); };
  const resetDomain = () => setDomainForm(emptyDomain);

  const editUser = (u) => {
    setSection("users");
    setUserTab(u.deletedAt ? "deleted" : u.userType === "guest" ? "guest" : "active");
    setEditingUserId(u.id);
    const matchingDomain = domains.find((domain) => u.email?.toLowerCase().endsWith(`@${domain.domain}`));
    setUserDomain(matchingDomain?.domain || "");
    const localPart = matchingDomain ? u.email.slice(0, -(matchingDomain.domain.length + 1)) : u.email || "";
    const parsedWorkingHours = parseWorkingHours(u.workingHours || "");
    setUserForm({
      name: u.name || "", emailLocalPart: localPart, password: "", role: u.role || "", team: u.team || "",
      workingHours: u.workingHours || "", location: u.location || "", userType: u.userType || "member",
    });
    setWorkingHoursStart(parsedWorkingHours.start);
    setWorkingHoursEnd(parsedWorkingHours.end);
    setActiveWorkingHoursPicker(null);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true); setMessage(""); setError("");
    try {
      if (!userDomain) {
        setError("Select one saved domain before creating or updating a user.");
        setSavingUser(false);
        return;
      }
      const normalizedEmail = `${userForm.emailLocalPart.trim()}@${userDomain}`;
      const payload = {
        ...userForm,
        email: normalizedEmail,
        workingHours: buildWorkingHours(workingHoursStart, workingHoursEnd),
      };
      const res = editingUserId
        ? await axios.patch(`${API_URL}/users/${editingUserId}`, payload, requestConfig)
        : await axios.post(`${API_URL}/users`, payload, requestConfig);
      setMessage(res.data.message); resetUser(); await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to save user.");
    } finally { setSavingUser(false); }
  };

  const softDeleteUser = async (u) => {
    if (!window.confirm(`Move ${u.email} to deleted users?`)) return;
    setMessage(""); setError("");
    try {
      const res = await axios.delete(`${API_URL}/users/${u.id}`, requestConfig);
      setMessage(res.data.message); await loadData();
    } catch (err) { setError(err.response?.data?.message || err.response?.data?.error || "Unable to delete user."); }
  };

  const restoreUser = async (u) => {
    setMessage(""); setError("");
    try {
      const res = await axios.patch(`${API_URL}/users/${u.id}/restore`, {}, requestConfig);
      setMessage(res.data.message); await loadData();
    } catch (err) { setError(err.response?.data?.message || err.response?.data?.error || "Unable to restore user."); }
  };

  const permanentDeleteUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.email}?`)) return;
    setMessage(""); setError("");
    try {
      const res = await axios.delete(`${API_URL}/users/${u.id}/permanent`, requestConfig);
      setMessage(res.data.message); await loadData();
    } catch (err) { setError(err.response?.data?.message || err.response?.data?.error || "Unable to permanently delete user."); }
  };

  const editGroup = (g) => {
    setSection("groups"); setEditingGroupId(g.id);
    setGroupForm({ name: g.name || "", description: g.description || "", memberIds: (g.members || []).map((m) => m.id) });
    setGroupMemberSearch("");
  };

  const toggleMember = (id) => setGroupForm((c) => ({ ...c, memberIds: c.memberIds.includes(id) ? c.memberIds.filter((v) => v !== id) : [...c.memberIds, id] }));

  const saveGroup = async (e) => {
    e.preventDefault();
    setSavingGroup(true); setMessage(""); setError("");
    try {
      const res = editingGroupId
        ? await axios.patch(`${API_URL}/groups/${editingGroupId}`, groupForm, requestConfig)
        : await axios.post(`${API_URL}/groups`, groupForm, requestConfig);
      setMessage(res.data.message); resetGroup(); await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to save group.");
    } finally { setSavingGroup(false); }
  };

  const deleteGroup = async (g) => {
    if (!window.confirm(`Delete group ${g.name}?`)) return;
    setMessage(""); setError("");
    try {
      const res = await axios.delete(`${API_URL}/groups/${g.id}`, requestConfig);
      setMessage(res.data.message); await loadData();
    } catch (err) { setError(err.response?.data?.message || err.response?.data?.error || "Unable to delete group."); }
  };

  const saveDomain = async (e) => {
    e.preventDefault();
    setSavingDomain(true); setMessage(""); setError("");
    try {
      const res = await axios.post(`${API_URL}/domains`, domainForm, requestConfig);
      setMessage(res.data.message);
      resetDomain();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to save domain.");
    } finally {
      setSavingDomain(false);
    }
  };

  const saveSecuritySettings = async (e) => {
    e.preventDefault();
    setSavingSecurity(true); setMessage(""); setError("");
    try {
      const trimmedName = securityForm.name.trim();
      const requests = [];

      if (trimmedName && trimmedName !== (currentUser.name || "").trim()) {
        requests.push(
          axios.patch(
            buildApiUrl("/auth/me"),
            { name: trimmedName },
            requestConfig
          )
        );
      }

      if (securityForm.currentPassword || securityForm.newPassword) {
        requests.push(
          axios.patch(
            buildApiUrl("/auth/change-password"),
            {
              currentPassword: securityForm.currentPassword,
              newPassword: securityForm.newPassword,
            },
            requestConfig
          )
        );
      }

      if (requests.length === 0) {
        setMessage("No security changes to save.");
        setSavingSecurity(false);
        return;
      }

      const responses = await Promise.all(requests);
      const profileResponse = responses.find((response) => response.data?.user);

      if (profileResponse?.data?.user) {
        localStorage.setItem("user", JSON.stringify(profileResponse.data.user));
      }

      setSecurityForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
      }));
      setMessage("Security settings updated.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to update security settings.");
    } finally {
      setSavingSecurity(false);
    }
  };

  const saveAttachmentLimit = async (e) => {
    e.preventDefault();
    setSavingAttachmentLimit(true); setMessage(""); setError("");
    try {
      const limitValue = Math.min(100, Math.max(1, Number.parseInt(attachmentLimitMb, 10) || 100));
      const response = await axios.patch(
        `${API_URL}/preferences`,
        { attachmentLimitMb: limitValue },
        requestConfig
      );

      setAttachmentLimitMb(String(response.data?.preferences?.attachmentLimitMb || limitValue));
      setMessage("Attachment limit updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to update attachment limit.");
    } finally {
      setSavingAttachmentLimit(false);
    }
  };

  const deleteDomain = async (domain) => {
    if (!window.confirm(`Delete domain ${domain.domain}?`)) return;
    setMessage(""); setError("");
    try {
      const res = await axios.delete(`${API_URL}/domains/${domain.id}`, requestConfig);
      setMessage(res.data.message);
      if (userDomain === domain.domain) {
        setUserDomain("");
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to delete domain.");
    }
  };

  const userCard = (u) => (
    <article key={u.id} className="rounded-[22px] border border-[#dfe7f2] bg-white p-5 shadow-[0_14px_30px_rgba(16,35,63,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9f2fc] text-sm font-bold text-[#256ab1]">{initials(u.name || u.email)}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[1.05rem] font-semibold text-[#1a2a42]">{u.name || "Unnamed user"}</p>
              <span className="rounded-full bg-[#eef3fa] px-2.5 py-1 text-[11px] font-semibold text-[#6c7d95]">{u.userType}</span>
              {u.deletedAt ? <span className="rounded-full bg-[#fff2e8] px-2.5 py-1 text-[11px] font-semibold text-[#b56a23]">{daysLeft(u.deletedAt)} days left</span> : null}
            </div>
            <p className="mt-1 text-sm text-[#73829a]">{u.email}</p>
            <div className="mt-3 grid gap-2 text-sm text-[#5f718b] md:grid-cols-2">
              <p>Role: {u.role || "Not set"}</p><p>Team: {u.team || "Not set"}</p>
              <p>Working hours: {u.workingHours || "Not set"}</p><p>Location: {u.location || "Not set"}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!u.deletedAt ? (
            <>
              <button onClick={() => editUser(u)} className="rounded-[12px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#5f718b]">Edit</button>
              <button onClick={() => softDeleteUser(u)} className="rounded-[12px] border border-[#f0d5d2] bg-[#fff7f6] px-3 py-2 text-sm font-semibold text-[#b14a45]">Delete</button>
            </>
          ) : (
            <>
              <button onClick={() => restoreUser(u)} className="rounded-[12px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#5f718b]">Restore</button>
              <button onClick={() => permanentDeleteUser(u)} className="rounded-[12px] border border-[#f0d5d2] bg-[#fff7f6] px-3 py-2 text-sm font-semibold text-[#b14a45]">Permanent delete</button>
            </>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_28%),linear-gradient(180deg,#dfe9f7_0%,#edf3fb_46%,#f4f7fc_100%)] p-2 text-[#1a2942] md:p-3">
      <div className="w-full">
        <div className="theme-app-shell flex min-h-[calc(100vh-16px)] w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/60 shadow-[0_30px_80px_rgba(31,51,81,0.12)] backdrop-blur-sm md:rounded-[30px]">
          <aside className="w-full max-w-[310px] border-r border-[#dfe7f2] bg-[linear-gradient(180deg,#eef4fb_0%,#e8eff8_100%)] p-6">
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">Admin Aksentt</p>
                <div className="mt-5 flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f70be] text-lg font-semibold text-white shadow-[0_12px_30px_rgba(31,112,190,0.25)]">{initials(currentUser.name || "Admin")}</div>
                  <div><p className="text-[1.4rem] font-semibold leading-tight text-[#17273e]">{currentUser.name || "Aksentt Admin"}</p><p className="mt-1 text-sm text-[#74839d]">{currentUser.email || "admin@aksentt.app"}</p></div>
                </div>
                <nav className="mt-8 space-y-2">
                  {NAV.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <button onClick={() => setSection(item.key)} className={`w-full rounded-[18px] px-4 py-3 text-left text-sm font-semibold ${section === item.key ? "bg-white text-[#24344e] shadow-[0_12px_28px_rgba(31,42,68,0.08)]" : "text-[#74839d] hover:bg-white/70"}`}>{item.label}</button>
                      {item.key === "users" && section === "users" ? (
                        <div className="space-y-1 pl-3">
                          {USER_TABS.map(([key, label]) => (
                            <button key={key} onClick={() => setUserTab(key)} className={`w-full rounded-[14px] px-4 py-2.5 text-left text-sm ${userTab === key ? "bg-[#2473c1] text-white" : "text-[#6c7d95] hover:bg-white/70"}`}>{label}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </nav>
              </div>
              <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.reload(); }} className="rounded-[16px] border border-[#d7e0ee] bg-white px-4 py-3 text-sm font-semibold text-[#6a7891]">Logout</button>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfe7f2] px-6 py-5 md:px-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">{section === "overview" ? "Overview" : section === "users" ? "User management" : section === "groups" ? "Teams & groups" : section === "roles" ? "Roles" : section === "settings" ? "Settings" : "Support"}</p>
                <h1 className="mt-2 text-[2rem] font-semibold text-[#16253d]">{section === "overview" ? "Workspace admin dashboard" : section === "users" ? "People and access" : section === "groups" ? "Shared teams and mail groups" : section === "roles" ? "Role overview" : section === "settings" ? "Mail domain settings" : "Admin help and notes"}</h1>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={loadData} className="rounded-[14px] border border-[#d7e0ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#5f718b]">Refresh</button>
                <button onClick={onToggleTheme} className="theme-toggle-button flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-[#eef4fb]"><ThemeIcon theme={theme} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
              {message ? <p className="mb-4 rounded-[16px] bg-[#edf8f1] px-4 py-3 text-sm font-medium text-[#2f7b56]">{message}</p> : null}
              {error ? <p className="mb-4 rounded-[16px] bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b14a45]">{error}</p> : null}
              {loading ? <div className="rounded-[24px] border border-dashed border-[#d7e0ee] bg-white px-6 py-12 text-center text-sm text-[#73829a]">Loading admin data...</div> : null}

              {!loading && section === "overview" ? (
                <div className="space-y-6">
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Active users", overview?.totals?.users ?? activeUsers.length],
                      ["Contacts", overview?.totals?.contacts ?? contactUsers.length],
                      ["Guest users", overview?.totals?.guests ?? guestUsers.length],
                      ["Deleted users", overview?.totals?.deletedUsers ?? deletedUsers.length],
                      ["Groups", overview?.totals?.groups ?? groups.length],
                    ].map(([label, value]) => <article key={label} className="theme-panel rounded-[24px] border border-[#dfe7f2] bg-white p-5 shadow-[0_18px_38px_rgba(16,35,63,0.06)]"><p className="text-sm font-medium text-[#7b8aa3]">{label}</p><p className="mt-3 text-[2rem] font-semibold text-[#16253d]">{value}</p></article>)}
                  </section>
                  <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <article className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                      <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Workspace overview</h2>
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[22px] bg-[#f7fafe] p-5"><p className="text-sm font-semibold text-[#314763]">Top roles</p><div className="mt-4 space-y-3">{(overview?.topRoles || []).length === 0 ? <p className="text-sm text-[#73829a]">No role data yet.</p> : overview.topRoles.map((r) => <div key={r.name} className="flex items-center justify-between gap-3"><span className="text-sm text-[#445977]">{r.name}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#256ab1]">{r.count}</span></div>)}</div></div>
                        <div className="rounded-[22px] bg-[#f7fafe] p-5"><p className="text-sm font-semibold text-[#314763]">Important notes</p><div className="mt-4 space-y-3 text-sm text-[#5f718b]"><p>Deleted users stay for 30 days.</p><p>Groups can receive shared mail.</p><p>Guest users stay separate from core members.</p></div></div>
                      </div>
                    </article>
                    <article className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                      <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Recent groups</h2>
                      <div className="mt-5 space-y-3">{groups.length === 0 ? <div className="rounded-[20px] border border-dashed border-[#d7e0ee] px-5 py-8 text-center text-sm text-[#73829a]">No groups created yet.</div> : groups.slice(0, 4).map((g) => <div key={g.id} className="rounded-[20px] bg-[#f8fbff] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-[#1a2a42]">{g.name}</p><p className="mt-1 text-sm text-[#73829a]">{g.email}</p><p className="mt-1 text-sm text-[#73829a]">{g.memberCount} members</p></div><button onClick={() => editGroup(g)} className="rounded-[12px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#5f718b]">Open</button></div></div>)}</div>
                    </article>
                  </section>
                </div>
              ) : null}

              {!loading && section === "users" ? (
                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-5 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                    <div className="flex items-center justify-between gap-3"><div><h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">{editingUserId ? "Update user" : "Add user"}</h2><p className="mt-1 text-sm text-[#73829a]">Create members or guest users, then manage them below.</p></div>{editingUserId ? <button onClick={resetUser} className="rounded-[14px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#667892]">Cancel</button> : null}</div>
                    {editingUserId ? <div className="mt-4 rounded-[18px] border border-[#dfe7f2] bg-[#f8fbff] px-4 py-3 text-sm text-[#61738d]"><p className="font-semibold text-[#314763]">Current password is hidden</p><p className="mt-1">For security, the existing password cannot be viewed. You can set a new password below and save the update.</p></div> : null}
                    <form className="mt-5 space-y-3" onSubmit={saveUser}>
                      <input value={userForm.name} onChange={(e) => setUserField("name", e.target.value)} placeholder="Full name" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
                        <input type="text" value={userForm.emailLocalPart} onChange={(e) => setUserField("emailLocalPart", e.target.value.replace(/@.*/, ""))} placeholder="Email name" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                        <select value={userDomain} onChange={(e) => setUserDomain(e.target.value)} className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white">
                          <option value="">Select domain</option>
                          {domains.map((domain) => <option key={domain.id} value={domain.domain}>{domain.domain}</option>)}
                        </select>
                      </div>
                      <input type="password" value={userForm.password} onChange={(e) => setUserField("password", e.target.value)} placeholder={editingUserId ? "Set new password (optional)" : "Password"} className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={userForm.role} onChange={(e) => setUserField("role", e.target.value)} placeholder="Job role" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                        <select value={userForm.userType} onChange={(e) => setUserField("userType", e.target.value)} className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"><option value="member">Member</option><option value="guest">Guest</option></select>
                      </div>
                      <input value={userForm.team} onChange={(e) => setUserField("team", e.target.value)} placeholder="Team" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <div className="grid gap-3 md:grid-cols-2">
                        <WorkingHoursWheelPicker
                          label="Start time"
                          helperLabel="From"
                          value={workingHoursStart}
                          onChange={setWorkingHoursStart}
                          isOpen={activeWorkingHoursPicker === "start"}
                          onToggle={() => setActiveWorkingHoursPicker((current) => current === "start" ? null : "start")}
                        />
                        <WorkingHoursWheelPicker
                          label="End time"
                          helperLabel="To"
                          value={workingHoursEnd}
                          onChange={setWorkingHoursEnd}
                          isOpen={activeWorkingHoursPicker === "end"}
                          onToggle={() => setActiveWorkingHoursPicker((current) => current === "end" ? null : "end")}
                        />
                      </div>
                      <input value={userForm.location} onChange={(e) => setUserField("location", e.target.value)} placeholder="Location" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <button type="submit" disabled={savingUser} className="w-full rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60">{savingUser ? "Saving..." : editingUserId ? "Update user" : "Add user"}</button>
                    </form>
                  </section>
                  <section className="space-y-5">
                    <div className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-4 shadow-[0_20px_42px_rgba(16,35,63,0.06)]"><div className="flex flex-wrap gap-2">{USER_TABS.map(([k, label]) => <button key={k} onClick={() => setUserTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${userTab === k ? "bg-[#2473c1] text-white" : "bg-[#eef3fa] text-[#61738d]"}`}>{label}</button>)}</div></div>
                    <div className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-4 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                        <input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search by name, email, role, team..."
                          className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                        />
                        <select
                          value={userFilter}
                          onChange={(e) => setUserFilter(e.target.value)}
                          className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                        >
                          <option value="">All job roles</option>
                          {roleFilterOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">{visibleUsers.length === 0 ? <div className="rounded-[22px] border border-dashed border-[#d7e0ee] bg-white px-6 py-10 text-center text-sm text-[#73829a]">No users in this section yet.</div> : visibleUsers.map(userCard)}</div>
                  </section>
                </div>
              ) : null}

              {!loading && section === "groups" ? (
                <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
                  <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-5 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                    <div className="flex items-center justify-between gap-3"><div><h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">{editingGroupId ? "Update group" : "Create group"}</h2><p className="mt-2 text-xs text-[#8a98af]">A group mail id is created automatically after save.</p></div>{editingGroupId ? <button onClick={resetGroup} className="rounded-[14px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#667892]">Cancel</button> : null}</div>
                    <form className="mt-5 space-y-4" onSubmit={saveGroup}>
                      <input value={groupForm.name} onChange={(e) => setGroupField("name", e.target.value)} placeholder="Group name" className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <textarea value={groupForm.description} onChange={(e) => setGroupField("description", e.target.value)} placeholder="Description" rows={3} className="w-full rounded-[18px] border border-[#d7e0ee] bg-[#f7fafe] px-4 py-3 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white" />
                      <div className="rounded-[22px] border border-[#dfe7f2] bg-[#fbfdff] p-4">
                        <p className="text-sm font-semibold text-[#314763]">Choose members</p>
                        <input
                          value={groupMemberSearch}
                          onChange={(e) => setGroupMemberSearch(e.target.value)}
                          placeholder="Search members by name or email"
                          className="mt-3 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-[14px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1]"
                        />
                        <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                          {groupUsers.length === 0 ? (
                            <p className="text-sm text-[#73829a]">No active or guest users available.</p>
                          ) : filteredGroupUsers.length === 0 ? (
                            <p className="text-sm text-[#73829a]">No matching members found.</p>
                          ) : (
                            filteredGroupUsers.map((u) => (
                              <label key={u.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e7edf6] bg-white px-3 py-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#23344d]">{u.name || u.email}</p>
                                  <p className="mt-1 text-xs text-[#7a8aa4]">{u.email}</p>
                                </div>
                                <input type="checkbox" checked={groupForm.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} className="h-4 w-4 rounded border-[#bfd0e6] text-[#2473c1] focus:ring-[#8fb9e1]" />
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <button type="submit" disabled={savingGroup} className="w-full rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60">{savingGroup ? "Saving..." : editingGroupId ? "Update group" : "Create group"}</button>
                    </form>
                  </section>
                  <section className="space-y-4">{groups.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#d7e0ee] bg-white px-6 py-12 text-center text-sm text-[#73829a]">No groups yet. Create one and use its name in the mail composer.</div> : groups.map((g) => <article key={g.id} className="rounded-[24px] border border-[#dfe7f2] bg-white p-5 shadow-[0_14px_30px_rgba(16,35,63,0.04)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-[1.1rem] font-semibold text-[#1a2a42]">{g.name}</h3><p className="mt-1 text-sm text-[#73829a]">Use "{g.name}" or "{g.email}" in the To, Cc, or Bcc field.</p>{g.description ? <p className="mt-3 text-sm leading-6 text-[#5f718b]">{g.description}</p> : null}</div><div className="flex gap-2"><button onClick={() => editGroup(g)} className="rounded-[12px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#5f718b]">Edit</button><button onClick={() => deleteGroup(g)} className="rounded-[12px] border border-[#f0d5d2] bg-[#fff7f6] px-3 py-2 text-sm font-semibold text-[#b14a45]">Delete</button></div></div><div className="mt-4 rounded-[18px] bg-[#f8fbff] px-4 py-3 text-sm text-[#5f718b]"><span className="font-semibold text-[#314763]">Group mail id:</span> {g.email}</div><div className="mt-4 flex flex-wrap gap-2">{(g.members || []).map((m) => <span key={m.id} className="rounded-full bg-[#eef3fa] px-3 py-1.5 text-xs font-semibold text-[#61738d]">{m.name || m.email}</span>)}{g.members?.length === 0 ? <span className="rounded-full bg-[#fff4e8] px-3 py-1.5 text-xs font-semibold text-[#b56a23]">No members yet</span> : null}</div></article>)}</section>
                </div>
              ) : null}

              {!loading && section === "roles" ? (
                <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                  <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Role distribution</h2>
                      <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-xs font-semibold text-[#5f718b]">
                        {roleSummary.length} roles
                      </span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {roleSummary.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-[#d7e0ee] px-5 py-8 text-center text-sm text-[#73829a]">
                          No role data yet.
                        </div>
                      ) : (
                        roleSummary.map((role) => (
                          <button
                            key={role.name}
                            type="button"
                            onClick={() => setSelectedRole(role.name)}
                            className={`flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left transition ${
                              activeRoleDetail?.name === role.name
                                ? "bg-[#eaf3fd] ring-1 ring-[#b8d3f0]"
                                : "bg-[#f8fbff] hover:bg-[#f1f6fc]"
                            }`}
                          >
                            <div>
                              <p className="font-medium text-[#314763]">{role.name}</p>
                              <p className="mt-1 text-xs text-[#73829a]">
                                {role.teams.length > 0 ? role.teams.join(", ") : "No team assigned"}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#256ab1]">
                              {role.count}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[1.4rem] font-semibold text-[#16253d]">
                          {activeRoleDetail ? activeRoleDetail.name : "Role details"}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#5f718b]">
                          {activeRoleDetail
                            ? `${activeRoleDetail.count} active user${activeRoleDetail.count === 1 ? "" : "s"} currently use this role.`
                            : "Select a role to view the users assigned to it."}
                        </p>
                      </div>
                      {activeRoleDetail ? (
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-xs font-semibold text-[#5f718b]">
                            {activeRoleDetail.count} users
                          </span>
                          <span className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-xs font-semibold text-[#5f718b]">
                            {activeRoleDetail.teams.length || 0} teams
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {activeRoleDetail ? (
                      <>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {activeRoleDetail.teams.length > 0 ? (
                            activeRoleDetail.teams.map((team) => (
                              <span key={team} className="rounded-full bg-[#f4f8fd] px-3 py-1.5 text-xs font-semibold text-[#60728c]">
                                {team}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-[#fff4e8] px-3 py-1.5 text-xs font-semibold text-[#b56a23]">
                              No team assigned
                            </span>
                          )}
                        </div>

                        <div className="mt-6 space-y-3">
                          {activeRoleDetail.users.map((user) => (
                            <article key={user.id} className="rounded-[20px] border border-[#e0e9f4] bg-[#fbfdff] px-4 py-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-[#23344d]">{user.name || "Unnamed user"}</p>
                                  <p className="mt-1 text-sm text-[#73829a]">{user.email}</p>
                                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#5f718b]">
                                    <span>Team: {user.team || "Not set"}</span>
                                    <span>Location: {user.location || "Not set"}</span>
                                    <span>Hours: {user.workingHours || "Not set"}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => editUser(user)}
                                  className="rounded-[12px] border border-[#d7e0ee] px-3 py-2 text-sm font-semibold text-[#5f718b]"
                                >
                                  Open
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 rounded-[20px] border border-dashed border-[#d7e0ee] px-5 py-8 text-center text-sm text-[#73829a]">
                        No role selected yet.
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              {!loading && section === "support" ? (
                <div className="space-y-6">
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Active users", overview?.totals?.users ?? activeUsers.length, "Core members currently active"],
                      ["Guest users", overview?.totals?.guests ?? guestUsers.length, "External or temporary access"],
                      ["Deleted users", overview?.totals?.deletedUsers ?? deletedUsers.length, "Recoverable for 30 days"],
                      ["Groups", overview?.totals?.groups ?? groups.length, "Shared delivery groups"],
                    ].map(([label, value, note]) => (
                      <article key={label} className="theme-panel rounded-[24px] border border-[#dfe7f2] bg-white p-5 shadow-[0_18px_38px_rgba(16,35,63,0.06)]">
                        <p className="text-sm font-medium text-[#7b8aa3]">{label}</p>
                        <p className="mt-3 text-[2rem] font-semibold text-[#16253d]">{value}</p>
                        <p className="mt-2 text-xs text-[#7d8da6]">{note}</p>
                      </article>
                    ))}
                  </section>

                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                      <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Admin support</h2>
                      <div className="mt-5 space-y-4 text-sm leading-7 text-[#5f718b]">
                        <p>Deleted users stay available for 30 days in the Deleted users section.</p>
                        <p>Use Restore if a deletion was accidental, or Permanent delete to remove them now.</p>
                        <p>For shared mail delivery, create a group and use that group name in the composer.</p>
                      </div>

                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <button onClick={() => setSection("users")} className="rounded-[18px] border border-[#d7e0ee] bg-[#f8fbff] px-4 py-4 text-left transition hover:bg-white">
                          <p className="font-semibold text-[#23344d]">Manage people</p>
                          <p className="mt-1 text-sm text-[#73829a]">Open users and access controls.</p>
                        </button>
                        <button onClick={() => setSection("groups")} className="rounded-[18px] border border-[#d7e0ee] bg-[#f8fbff] px-4 py-4 text-left transition hover:bg-white">
                          <p className="font-semibold text-[#23344d]">Review groups</p>
                          <p className="mt-1 text-sm text-[#73829a]">Check shared inbox groups and members.</p>
                        </button>
                        <button onClick={() => setSection("roles")} className="rounded-[18px] border border-[#d7e0ee] bg-[#f8fbff] px-4 py-4 text-left transition hover:bg-white">
                          <p className="font-semibold text-[#23344d]">Browse roles</p>
                          <p className="mt-1 text-sm text-[#73829a]">See who is assigned to each job role.</p>
                        </button>
                        <button onClick={() => setSection("settings")} className="rounded-[18px] border border-[#d7e0ee] bg-[#f8fbff] px-4 py-4 text-left transition hover:bg-white">
                          <p className="font-semibold text-[#23344d]">Open settings</p>
                          <p className="mt-1 text-sm text-[#73829a]">Add or clean up workspace mail domains.</p>
                        </button>
                      </div>
                    </section>

                    <div className="space-y-6">
                      <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                        <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Current admin account</h2>
                        <div className="mt-5 rounded-[22px] bg-[#f8fbff] p-5 text-sm text-[#5f718b]">
                          <p className="font-semibold text-[#23344d]">{currentUser.name || "Aksentt Admin"}</p>
                          <p className="mt-1">{currentUser.email || "admin@aksentt.app"}</p>
                          <p className="mt-4">This remains the single admin login in the current setup.</p>
                        </div>
                      </section>

                      <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                        <h2 className="text-[1.4rem] font-semibold text-[#16253d]">Recovery checklist</h2>
                        <div className="mt-5 space-y-3">
                          {[
                            { label: "Review deleted users", detail: `${deletedUsers.length} waiting in recovery` },
                            { label: "Verify shared groups", detail: `${groups.length} groups available for mail delivery` },
                            { label: "Check guest access", detail: `${guestUsers.length} guest accounts currently active` },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#f8fbff] px-4 py-3">
                              <div>
                                <p className="font-medium text-[#314763]">{item.label}</p>
                                <p className="mt-1 text-sm text-[#73829a]">{item.detail}</p>
                              </div>
                              <span className="h-2.5 w-2.5 rounded-full bg-[#6aa3df]" />
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              ) : null}

              {!loading && section === "settings" ? (
                <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-5 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                    <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Settings sections</h2>
                    <div className="mt-5 space-y-2">
                      {SETTINGS_TABS.map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSettingsTab(key)}
                          className={`w-full rounded-[18px] px-4 py-3 text-left text-sm font-semibold transition ${
                            settingsTab === key ? "bg-[#eaf3fd] text-[#24344e] ring-1 ring-[#b8d3f0]" : "bg-[#f8fbff] text-[#6b7b93] hover:bg-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    {settingsTab === "domains" ? (
                      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                          <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Mail domain settings</h2>
                          <p className="mt-1 text-sm text-[#73829a]">Add domain endings like `aksentt.in` or `aksentt.net` for workspace mail creation.</p>
                          <form className="mt-5 space-y-3" onSubmit={saveDomain}>
                            <input
                              value={domainForm.domain}
                              onChange={(e) => setDomainForm({ domain: e.target.value })}
                              placeholder="aksentt.in"
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={savingDomain}
                              className="w-full rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingDomain ? "Saving..." : "Add domain"}
                            </button>
                          </form>
                        </section>

                        <section className="space-y-4">
                          <div className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-5 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                            <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Available domains</h2>
                            <p className="mt-1 text-sm text-[#73829a]">These domains can be selected while creating or updating users.</p>
                          </div>
                          {domains.length === 0 ? (
                            <div className="rounded-[22px] border border-dashed border-[#d7e0ee] bg-white px-6 py-10 text-center text-sm text-[#73829a]">No domains added yet.</div>
                          ) : (
                            domains.map((domain) => (
                              <article key={domain.id} className="rounded-[22px] border border-[#dfe7f2] bg-white p-5 shadow-[0_14px_30px_rgba(16,35,63,0.04)]">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-[1.05rem] font-semibold text-[#1a2a42]">{domain.domain}</p>
                                    <p className="mt-1 text-sm text-[#73829a]">Use this as a workspace mail ending.</p>
                                  </div>
                                  <button onClick={() => deleteDomain(domain)} className="rounded-[12px] border border-[#f0d5d2] bg-[#fff7f6] px-3 py-2 text-sm font-semibold text-[#b14a45]">Delete</button>
                                </div>
                              </article>
                            ))
                          )}
                        </section>
                      </div>
                    ) : null}

                    {settingsTab === "privacy" ? (
                      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                          <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Privacy & security</h2>
                          <p className="mt-1 text-sm text-[#73829a]">Update your admin display name and password here.</p>
                          <form className="mt-5 space-y-3" onSubmit={saveSecuritySettings}>
                            <input
                              value={securityForm.name}
                              onChange={(e) => setSecurityField("name", e.target.value)}
                              placeholder="Admin name"
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                            />
                            <input
                              value={currentUser.email || ""}
                              disabled
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#eef3fa] px-4 text-[15px] text-[#6b7b93] outline-none"
                            />
                            <input
                              type="password"
                              value={securityForm.currentPassword}
                              onChange={(e) => setSecurityField("currentPassword", e.target.value)}
                              placeholder="Current password"
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                            />
                            <input
                              type="password"
                              value={securityForm.newPassword}
                              onChange={(e) => setSecurityField("newPassword", e.target.value)}
                              placeholder="New password"
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                            />
                            <button
                              type="submit"
                              disabled={savingSecurity}
                              className="w-full rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingSecurity ? "Saving..." : "Save privacy settings"}
                            </button>
                          </form>
                        </section>

                        <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                          <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Admin account safety</h2>
                          <div className="mt-5 space-y-3 text-sm leading-7 text-[#5f718b]">
                            <p>Keep the admin display name updated so internal users know who manages the workspace.</p>
                            <p>Use a strong password with at least 6 characters. After a password change, new logins will use the updated value immediately.</p>
                            <p>The admin email stays fixed here so workspace access remains stable.</p>
                          </div>
                        </section>
                      </div>
                    ) : null}

                    {settingsTab === "attachments" ? (
                      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                          <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Attachment limit</h2>
                          <p className="mt-1 text-sm text-[#73829a]">Set the maximum total attachment size allowed while users send mail.</p>
                          <form className="mt-5 space-y-3" onSubmit={saveAttachmentLimit}>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={attachmentLimitMb}
                              onChange={(e) => setAttachmentLimitMb(e.target.value)}
                              placeholder="100"
                              className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                            />
                            <p className="text-xs text-[#7d8da6]">Allowed range: 1 MB to 100 MB.</p>
                            <button
                              type="submit"
                              disabled={savingAttachmentLimit}
                              className="w-full rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingAttachmentLimit ? "Saving..." : "Save attachment limit"}
                            </button>
                          </form>
                        </section>

                        <section className="theme-panel rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_20px_42px_rgba(16,35,63,0.06)]">
                          <h2 className="text-[1.35rem] font-semibold text-[#1a2a42]">Limit behavior</h2>
                          <div className="mt-5 space-y-3 text-sm leading-7 text-[#5f718b]">
                            <p>Users can attach files only up to the saved total size limit.</p>
                            <p>If the selected attachments exceed the limit, the composer blocks the upload before sending.</p>
                            <p>The current configured limit is <span className="font-semibold text-[#23344d]">{attachmentLimitMb || "100"} MB</span>.</p>
                          </div>
                        </section>
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
