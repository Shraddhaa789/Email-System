import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

const featureCards = [
  {
    title: "Clear head, clear inbox",
    description: "Scan faster, reply quicker, and keep the noise from taking over your day.",
  },
  {
    title: "Built for the whole flow",
    description: "Jump from mail to meetings to tasks without feeling like you switched apps five times.",
  },
];

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.3" />
    <path d="M12 19.2v2.3" />
    <path d="M4.9 4.9l1.6 1.6" />
    <path d="M17.5 17.5l1.6 1.6" />
    <path d="M2.5 12h2.3" />
    <path d="M19.2 12h2.3" />
    <path d="M4.9 19.1l1.6-1.6" />
    <path d="M17.5 6.5l1.6-1.6" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.7 8.7 0 1 0 10.2 10.2z" />
  </svg>
);

const storeSession = ({ token, user }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const AuthPage = ({ onAuthenticated, onToggleTheme, theme }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [forgotForm, setForgotForm] = useState({
    email: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateForgotField = (field, value) => {
    setForgotForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const response = await axios.post(`${API_URL}/login`, {
          email: form.email,
          password: form.password,
        });

        storeSession(response.data);
        onAuthenticated();
        return;
      }

      await axios.post(`${API_URL}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      const loginResponse = await axios.post(`${API_URL}/login`, {
        email: form.email,
        password: form.password,
      });

      storeSession(loginResponse.data);
      onAuthenticated();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError("");
    setForgotMessage("");
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/forgot-password`, forgotForm);
      setForgotMessage(response.data.message);
      setForgotForm({
        email: "",
        newPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_28%),linear-gradient(180deg,#dfe9f7_0%,#edf3fb_46%,#f4f7fc_100%)] px-4 py-6 text-[#1a2942] md:px-8 md:py-8">
      <div className="mx-auto mb-4 flex max-w-[1480px] justify-end">
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="auth-theme-toggle flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e0ee] bg-white text-[#52647f] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-[#eef4fb]"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="theme-app-shell mx-auto grid min-h-[calc(100vh-48px)] max-w-[1480px] overflow-hidden rounded-[34px] border border-white/70 bg-white/60 shadow-[0_30px_80px_rgba(31,51,81,0.12)] backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-hero-section relative overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#e7eef8_100%)] p-8 md:p-12">
          <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-white/40 blur-3xl" />
          <div className="absolute bottom-[-8%] right-[-6%] h-72 w-72 rounded-full bg-[#d3e4f8] blur-3xl" />

          <div className="relative z-10 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              Workspace Mail
            </p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.02] text-[#16253d]">
              Make work feel a little lighter.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#6d7d97]">
              A calmer space for your mail, calendar, tasks, and day-to-day
              details, designed to keep everything moving without the visual noise.
            </p>

            <div className="mt-10 grid gap-4">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="theme-panel rounded-[24px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_40px_rgba(31,51,81,0.08)]"
                >
                  <h2 className="text-xl font-semibold text-[#1d2c45]">{card.title}</h2>
                  <p className="mt-2 text-[15px] leading-7 text-[#70809a]">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="auth-card theme-panel w-full max-w-xl rounded-[30px] border border-[#e2eaf4] bg-white p-7 shadow-[0_22px_50px_rgba(16,35,63,0.08)] md:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
                  Access
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[#16253d]">
                  {mode === "login" ? "Welcome back" : "Create your workspace"}
                </h2>
              </div>

              <div className="auth-mode-switch rounded-full bg-[#eef3fa] p-1">
                <button
                  onClick={() => setMode("login")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    mode === "login" ? "bg-[#2473c1] text-white" : "text-[#74839d]"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setMode("register")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    mode === "register" ? "bg-[#2473c1] text-white" : "text-[#74839d]"
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#4e5f7a]">
                    Full name
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Your full name"
                    className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4e5f7a]">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="user@workspace.app"
                  className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4e5f7a]">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder={mode === "login" ? "Enter your password" : "Choose a password"}
                  className="h-12 w-full rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
                />
              </div>

              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen((current) => !current);
                    setForgotMessage("");
                    setError("");
                    setForgotForm((current) => ({
                      ...current,
                      email: form.email || current.email,
                    }));
                  }}
                  className="text-sm font-semibold text-[#2473c1]"
                >
                  Forgot password?
                </button>
              ) : null}

              {mode === "login" && isForgotOpen ? (
                <div className="auth-forgot-panel rounded-[20px] border border-[#dfe7f2] bg-[#f7fafe] p-4">
                  <p className="text-sm font-semibold text-[#28415f]">Reset password</p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="email"
                      value={forgotForm.email}
                      onChange={(event) => updateForgotField("email", event.target.value)}
                      placeholder="Your account email"
                      className="h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1]"
                    />
                    <input
                      type="password"
                      value={forgotForm.newPassword}
                      onChange={(event) => updateForgotField("newPassword", event.target.value)}
                      placeholder="New password"
                      className="h-11 w-full rounded-[14px] border border-[#d7e0ee] bg-white px-4 text-[15px] text-[#21314d] outline-none focus:border-[#8fb9e1]"
                    />
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSubmitting}
                      className="rounded-[14px] bg-[#2473c1] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset password
                    </button>
                  </div>

                  {forgotMessage ? (
                    <p className="mt-3 text-sm font-medium text-[#2f7b56]">{forgotMessage}</p>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p className="rounded-[16px] bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b14a45]">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                </button>

              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
