import { useMemo, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../config/api";

const tabs = ["Overview", "Contact", "Organization", "Files"];

const statusPill = {
  detail: "Work hours",
};

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

const getAvailabilityLabel = (workingHours) => {
  const parts = workingHours.split("-").map((part) => part.trim());

  if (parts.length !== 2) {
    return "Offline - Update working hours";
  }

  const startMinutes = parseTimePart(parts[0]);
  const endMinutes = parseTimePart(parts[1]);

  if (startMinutes === null || endMinutes === null) {
    return "Offline - Update working hours";
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return `Online - Available until ${parts[1]}`;
  }

  if (currentMinutes < startMinutes) {
    return `Offline - Available from ${parts[0]}`;
  }

  return `Offline - Available tomorrow from ${parts[0]}`;
};

const ProfilePanel = ({ onClose, onUserUpdated, user }) => {
  const [activeTab, setActiveTab] = useState("Contact");
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "",
    team: user?.team || "",
    workingHours: user?.workingHours || "",
    location: user?.location || "",
  });
  const [availability, setAvailability] = useState({
    workingHours: user?.workingHours || "9:00 AM - 6:00 PM",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [error, setError] = useState("");

  const requestConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }),
    []
  );

  const availabilityLabel = useMemo(
    () => getAvailabilityLabel(availability.workingHours),
    [availability.workingHours]
  );

  const updateField = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setError("");
    setProfileMessage("");

    try {
      const response = await axios.patch(
        buildApiUrl("/auth/me"),
        {
          name: profile.name,
          role: profile.role,
          team: profile.team,
          workingHours: availability.workingHours,
          location: profile.location,
        },
        requestConfig
      );

      localStorage.setItem("user", JSON.stringify(response.data.user));
      onUserUpdated?.(response.data.user);
      setProfile((current) => ({
        ...current,
        workingHours: availability.workingHours,
      }));
      setProfileMessage("Profile updated");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to update profile."
      );
    }
  };

  return (
    <div className="profile-panel-overlay fixed inset-0 z-50 flex justify-end bg-[#13233f]/18 backdrop-blur-[4px]">
      <div className="profile-panel-shell flex h-full w-full max-w-[760px] flex-col border-l border-white/60 bg-[#fbfdff] shadow-[-16px_0_42px_rgba(17,35,61,0.12)]">
        <div className="border-b border-[#dfe7f2] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
                Profile
              </p>
              <h2 className="mt-2 text-[2rem] font-semibold text-[#1a2a42]">
                {profile.name || "Workspace profile"}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="profile-close-button rounded-[14px] border border-[#d7e0ee] bg-white px-4 py-2 text-sm font-semibold text-[#6b7b93]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-[#dfe7f2] px-6">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-4 text-sm font-medium transition ${
                  activeTab === tab
                    ? "border-[#2473c1] text-[#1a2a42]"
                    : "border-transparent text-[#63748f] hover:text-[#1a2a42]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "Contact" ? (
            <div className="px-6 py-5">
              <div className="rounded-[18px] border border-[#dfe7f2] bg-white">
                <div className="flex items-start gap-3 border-b border-[#e6edf7] px-4 py-4">
                  <div>
                    <p className="text-[16px] font-semibold text-[#23344d]">
                      {availabilityLabel}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-[#74839d]">{statusPill.detail}</p>
                    <input
                      value={availability.workingHours}
                      onChange={(event) =>
                        setAvailability((current) => ({
                          ...current,
                          workingHours: event.target.value,
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 py-4">
                  <span className="mt-0.5 text-[#6a7891]">-</span>
                  <div>
                    <p className="text-[15px] text-[#4f617b]">
                      {new Date().toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      - Your local time
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-[1.5rem] font-semibold text-[#1a2a42]">
                  Contact information
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[18px] border border-[#dfe7f2] bg-white p-4">
                    <p className="text-sm font-medium text-[#6e7d95]">Email</p>
                    <p className="mt-2 text-[17px] font-semibold text-[#2473c1]">
                      {profile.email}
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-[#dfe7f2] bg-white p-4">
                    <p className="text-sm font-medium text-[#6e7d95]">Chat</p>
                    <p className="mt-2 text-[17px] font-semibold text-[#2473c1]">
                      {profile.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-[#dfe7f2] bg-white p-5">
                <h3 className="text-[1.3rem] font-semibold text-[#1a2a42]">
                  Work profile
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <input
                    value={profile.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Full name"
                    className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                  />
                  <input
                    value={profile.email}
                    readOnly
                    className="h-12 rounded-[16px] border border-[#e2e8f2] bg-[#f1f5fa] px-4 text-[15px] text-[#6f8098] outline-none"
                  />
                  <input
                    value={profile.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    placeholder="Role"
                    className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                  />
                  <input
                    value={profile.team}
                    onChange={(event) => updateField("team", event.target.value)}
                    placeholder="Team"
                    className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                  />
                  <input
                    value={profile.workingHours}
                    onChange={(event) => updateField("workingHours", event.target.value)}
                    placeholder="Working hours"
                    className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                  />
                  <input
                    value={profile.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    placeholder="Location"
                    className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1] focus:bg-white"
                  />
                </div>

                <button
                  onClick={saveProfile}
                  className="mt-5 rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)]"
                >
                  Save profile
                </button>

                {profileMessage ? (
                  <p className="mt-3 text-sm font-medium text-[#2f7b56]">{profileMessage}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-6 py-10">
              <div className="rounded-[22px] border border-dashed border-[#d7e0ee] bg-white px-6 py-10 text-center">
                <h3 className="text-[1.4rem] font-semibold text-[#1a2a42]">{activeTab}</h3>
                <p className="mt-3 text-sm leading-6 text-[#73829a]">
                  This tab is ready for extension. We can add richer {activeTab.toLowerCase()} details
                  next while keeping the profile experience aligned with Outlook-style contact cards.
                </p>
              </div>
            </div>
          )}

          {error ? (
            <div className="px-6 pb-6">
              <p className="text-sm font-medium text-[#b14a45]">{error}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
