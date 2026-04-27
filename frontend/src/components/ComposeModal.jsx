import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../config/api";

const normalizeAttachmentLimitMb = (value) =>
  Math.min(100, Math.max(1, Number.parseInt(value, 10) || 25));

const getSignatureById = (settings, id) =>
  settings?.signatures?.find((signature) => signature.id === id) || null;

const getSignatureContent = (signature) => {
  if (!signature) {
    return "";
  }

  const bookingLine = signature.includeBookings ? "\nBook time: https://workspace.app/bookings" : "";
  return `${signature.content || ""}${bookingLine}`.trim();
};

const withSignature = (text, signature) => {
  const trimmed = text || "";
  const signatureText = getSignatureContent(signature);

  if (!signatureText) {
    return trimmed;
  }

  if (trimmed.includes(signatureText)) {
    return trimmed;
  }

  return trimmed ? `${trimmed}\n\n${signatureText}` : signatureText;
};

const stripSignature = (text, signature) => {
  const signatureText = getSignatureContent(signature);
  const normalizedText = (text || "").trimEnd();

  if (!signatureText || !normalizedText.endsWith(signatureText)) {
    return text || "";
  }

  return normalizedText.slice(0, normalizedText.length - signatureText.length).trimEnd();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
      });
    reader.onerror = () => reject(new Error("Unable to read attachment"));
    reader.readAsDataURL(file);
  });

const getAttachmentsSizeBytes = (attachments = []) =>
  attachments.reduce((total, attachment) => total + (attachment?.size || 0), 0);

const getActiveToken = (value = "") => value.split(/[,;\n]+/).pop()?.trim() || "";

const replaceActiveToken = (value, nextToken) => {
  const parts = value.replace(/[;\n]+/g, ",").split(",");
  parts[parts.length - 1] = ` ${nextToken}`;
  return `${parts.join(",").replace(/^ /, "")}, `;
};

const getStoredUser = () => {
  try {
    const value = localStorage.getItem("user");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const formatDraftSavedTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);

const getFallbackSignatureLines = (user) => {
  const userName = user?.name || "Shraddha More";
  return [
    "Thanks & Regards,",
    userName,
    user?.jobTitle || "Project Assistant - PMA",
  ];
};

const getSignatureLines = (signature, user) => {
  const signatureText = getSignatureContent(signature);

  if (!signatureText) {
    return getFallbackSignatureLines(user);
  }

  return signatureText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const RecipientField = ({
  label,
  value,
  onChange,
  suggestions,
  isLoading,
  isOpen,
  onFocus,
  onBlur,
  onSelectSuggestion,
  fieldKey,
  inputRef,
  inlineAction,
}) => (
  <div className="relative">
    <div className="flex min-h-[44px] items-center gap-3 border-b border-[#cfd8e6] px-3 transition focus-within:border-[var(--accent-color)]">
      <span className="inline-flex h-8 min-w-[48px] items-center justify-center rounded-[6px] border border-[#d6deea] bg-white px-3 text-[15px] font-medium text-[#24344d]">
        {label}
      </span>
      <input
        ref={inputRef}
        value={value}
        placeholder=""
        className="h-11 flex-1 border-0 bg-transparent px-0 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8]"
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocus(fieldKey)}
        onBlur={onBlur}
      />
      {inlineAction}
    </div>

    {isOpen ? (
      <div className="absolute left-[72px] right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[16px] border border-[#d7e0ee] bg-white shadow-[0_18px_42px_rgba(16,35,63,0.14)]">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-[#73829a]">Looking for users and groups...</p>
        ) : suggestions.length > 0 ? (
          <div className="max-h-64 overflow-y-auto py-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelectSuggestion(fieldKey, suggestion, value);
                }}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[#f5f9ff]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1f3048]">{suggestion.name}</p>
                  <p className="mt-1 text-xs text-[#73829a]">{suggestion.email}</p>
                </div>
                <span className="rounded-full bg-[#eef3fa] px-2.5 py-1 text-[11px] font-semibold text-[#5f718b]">
                  {suggestion.type === "group"
                    ? `${suggestion.memberCount} members`
                    : "User"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-[#73829a]">No matching user or group found.</p>
        )}
      </div>
    ) : null}
  </div>
);

const ComposeModal = ({
  initialValues,
  modeLabel = "New message",
  onClose,
  onSaved,
  settings,
  variant = "modal",
}) => {
  const isReplyMode = /reply|forward/i.test(modeLabel);
  const defaultSignature = useMemo(() => {
    const signatureId = isReplyMode
      ? settings?.defaultSignatureReply
      : settings?.defaultSignatureNew;

    return getSignatureById(settings, signatureId);
  }, [isReplyMode, settings]);

  const [to, setTo] = useState(initialValues?.to || "");
  const [cc, setCc] = useState(initialValues?.cc || "");
  const [bcc, setBcc] = useState(initialValues?.bcc || "");
  const [subject, setSubject] = useState(initialValues?.subject || "");
  const [body, setBody] = useState(stripSignature(initialValues?.body || "", defaultSignature));
  const [attachments, setAttachments] = useState(initialValues?.attachments || []);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [recipientSuggestions, setRecipientSuggestions] = useState([]);
  const [activeRecipientField, setActiveRecipientField] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionRequestRef = useRef(0);
  const recipientInputRefs = useRef({});
  const composeUser = useMemo(() => getStoredUser(), []);
  const signatureLines = useMemo(
    () => getSignatureLines(defaultSignature, composeUser),
    [composeUser, defaultSignature]
  );
  const [showBcc, setShowBcc] = useState(Boolean(initialValues?.bcc));
  const [attachmentLimitMb, setAttachmentLimitMb] = useState(
    normalizeAttachmentLimitMb(settings?.attachmentLimitMb)
  );

  useEffect(() => {
    let isMounted = true;

    const loadMailPreferences = async () => {
      try {
        const response = await axios.get(buildApiUrl("/auth/mail-preferences"), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!isMounted) {
          return;
        }

        setAttachmentLimitMb(
          normalizeAttachmentLimitMb(response.data?.attachmentLimitMb)
        );
      } catch {
        if (isMounted) {
          setAttachmentLimitMb(normalizeAttachmentLimitMb(settings?.attachmentLimitMb));
        }
      }
    };

    loadMailPreferences();

    return () => {
      isMounted = false;
    };
  }, [settings?.attachmentLimitMb]);

  useEffect(() => {
    const currentValue =
      activeRecipientField === "to" ? to : activeRecipientField === "cc" ? cc : activeRecipientField === "bcc" ? bcc : "";
    const query = getActiveToken(currentValue);

    if (!activeRecipientField || query.length === 0) {
      setRecipientSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;
    setLoadingSuggestions(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await axios.get(buildApiUrl("/email/recipient-suggestions"), {
          params: { q: query },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (suggestionRequestRef.current === requestId) {
          setRecipientSuggestions(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (suggestionRequestRef.current === requestId) {
          setRecipientSuggestions([]);
        }
      } finally {
        if (suggestionRequestRef.current === requestId) {
          setLoadingSuggestions(false);
        }
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [activeRecipientField, to, cc, bcc]);

  const selectSuggestion = (field, suggestion, currentValue) => {
    const nextToken =
      suggestion.type === "user"
        ? suggestion.email
        : getActiveToken(currentValue).includes("@")
        ? suggestion.email
        : suggestion.name;

    if (field === "to") {
      setTo((current) => replaceActiveToken(current, nextToken));
    }

    if (field === "cc") {
      setCc((current) => replaceActiveToken(current, nextToken));
    }

    if (field === "bcc") {
      setBcc((current) => replaceActiveToken(current, nextToken));
    }

    setRecipientSuggestions([]);
    setActiveRecipientField(field);
    window.setTimeout(() => {
      const input = recipientInputRefs.current[field];
      input?.focus();
      input?.setSelectionRange?.(input.value.length, input.value.length);
    }, 0);
  };

  const sendEmail = async () => {
    setError("");
    setIsSending(true);

    try {
      await axios.post(
        buildApiUrl("/email/send"),
        { to, cc, bcc, subject, body: withSignature(body, defaultSignature), attachments },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      onSaved?.("sent");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send email right now.");
    } finally {
      setIsSending(false);
    }
  };

  const saveDraft = async () => {
    setError("");
    setIsSending(true);

    try {
      await axios.post(
        buildApiUrl("/email/draft"),
        { to, cc, bcc, subject, body: withSignature(body, defaultSignature), attachments },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      onSaved?.("drafts");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save draft right now.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    try {
      const nextAttachments = await Promise.all(files.map(readFileAsDataUrl));
      const nextTotalBytes = getAttachmentsSizeBytes([...attachments, ...nextAttachments]);

      if (nextTotalBytes > attachmentLimitMb * 1024 * 1024) {
        setError(`Attachments exceed the ${attachmentLimitMb} MB limit.`);
        return;
      }

      setAttachments((current) => [...current, ...nextAttachments]);
    } catch {
      setError("Unable to attach one or more files.");
    } finally {
      event.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const draftSavedAt = formatDraftSavedTime(new Date());
  const signatureLead = signatureLines.slice(0, 3);
  const signatureDetails = signatureLines.slice(3);
  const isPane = variant === "pane";

  return (
    <div
      className={
        isPane
          ? "compose-pane-shell mail-view-shell flex min-h-[420px] flex-1 flex-col bg-[#fbfdff]"
          : "fixed inset-0 z-50 flex items-center justify-center bg-[#13233f]/14 p-2 backdrop-blur-[6px] md:p-4"
      }
    >
      <div
        className={
          isPane
            ? "compose-modal-shell theme-panel flex min-h-[420px] flex-1 flex-col overflow-hidden border-l border-[#dbe4f2] bg-[#fdfefe]"
            : "compose-modal-shell theme-panel flex h-[min(92vh,860px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] border border-[#d7e0ee] bg-[#fdfefe] shadow-[0_28px_80px_rgba(16,35,63,0.18)]"
        }
      >
        <div className="flex items-center justify-between border-b border-[#dbe4f2] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={sendEmail}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-[4px] bg-[#0f6cbd] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,108,189,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M3 20L21 12L3 4L6 12L3 20Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{isSending ? "Sending..." : "Send"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M7 10L12 15L17 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={saveDraft}
              disabled={isSending}
              className="rounded-[6px] px-3 py-2 text-sm font-medium text-[#5d6f88] transition hover:bg-[#f1f5fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save draft
            </button>
          </div>

          <div className="flex items-center gap-1 text-[#5d6f88]">
            <button
              type="button"
              className="rounded-full p-2 transition hover:bg-[#f1f5fa]"
              aria-label="Protect draft"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M12 3L18 6V11C18 15 15.5 18 12 19C8.5 18 6 15 6 11V6L12 3Z" />
                <path d="M12 9V12" />
                <path d="M12 15H12.01" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-full p-2 transition hover:bg-[#f1f5fa]"
              aria-label="Delete draft"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M4 7h16" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M6 7l1 12h10l1-12" />
                <path d="M9 7V4h6v3" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition hover:bg-[#f1f5fa]"
              aria-label={isPane ? "Close compose pane" : "Close compose window"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <RecipientField
            label="To"
            value={to}
            onChange={setTo}
            suggestions={recipientSuggestions}
            isLoading={loadingSuggestions}
            isOpen={activeRecipientField === "to" && (loadingSuggestions || recipientSuggestions.length > 0 || getActiveToken(to).length > 0)}
            onFocus={setActiveRecipientField}
            onBlur={() => window.setTimeout(() => setActiveRecipientField((current) => (current === "to" ? null : current)), 120)}
            onSelectSuggestion={selectSuggestion}
            fieldKey="to"
            inputRef={(element) => {
              recipientInputRefs.current.to = element;
            }}
            inlineAction={
              !showBcc ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowBcc(true)}
                  className="text-sm font-medium text-[#5b6e87] transition hover:text-[var(--accent-color)]"
                >
                  Bcc
                </button>
              ) : null
            }
          />

          <RecipientField
            label="Cc"
            value={cc}
            onChange={setCc}
            suggestions={recipientSuggestions}
            isLoading={loadingSuggestions}
            isOpen={activeRecipientField === "cc" && (loadingSuggestions || recipientSuggestions.length > 0 || getActiveToken(cc).length > 0)}
            onFocus={setActiveRecipientField}
            onBlur={() => window.setTimeout(() => setActiveRecipientField((current) => (current === "cc" ? null : current)), 120)}
            onSelectSuggestion={selectSuggestion}
            fieldKey="cc"
            inputRef={(element) => {
              recipientInputRefs.current.cc = element;
            }}
          />

          {showBcc ? (
            <RecipientField
              label="Bcc"
              value={bcc}
              onChange={setBcc}
              suggestions={recipientSuggestions}
              isLoading={loadingSuggestions}
              isOpen={activeRecipientField === "bcc" && (loadingSuggestions || recipientSuggestions.length > 0 || getActiveToken(bcc).length > 0)}
              onFocus={setActiveRecipientField}
              onBlur={() => window.setTimeout(() => setActiveRecipientField((current) => (current === "bcc" ? null : current)), 120)}
              onSelectSuggestion={selectSuggestion}
              fieldKey="bcc"
              inputRef={(element) => {
                recipientInputRefs.current.bcc = element;
              }}
            />
          ) : null}

          <div className="flex min-h-[48px] items-center gap-4 border-b border-[#cfd8e6] px-3">
            <input
              value={subject}
              placeholder="Add a subject"
              className="h-11 flex-1 border-0 bg-transparent px-0 text-[15px] text-[#21314d] outline-none placeholder:text-[#5f6f85]"
              onChange={(event) => setSubject(event.target.value)}
            />
            <p className="whitespace-nowrap text-sm text-[#677892]">Draft saved at {draftSavedAt}</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
            <textarea
              value={body}
              placeholder="Write your message"
              rows={8}
              className="min-h-[180px] flex-1 resize-none border-0 bg-transparent px-0 py-3 text-[17px] leading-8 text-[#1f2f47] outline-none placeholder:text-[#98a6ba]"
              onChange={(event) => setBody(event.target.value)}
            />

            <div className="pointer-events-none mt-2 max-w-[820px] pb-4">
              <div className="whitespace-pre-wrap text-[17px] leading-8 text-[#111827]">
                {signatureLead[0] ? <p className="m-0 font-semibold">{signatureLead[0]}</p> : null}
                {signatureLead[1] ? <p className="m-0">{signatureLead[1]}</p> : null}
                {signatureLead[2] ? <p className="m-0">{signatureLead[2]}</p> : null}
              </div>

              {signatureDetails.length ? (
                <div className="mt-10 max-w-[760px]">
                  <div className="mb-3 flex items-end gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#f8c33b_0%,#f5a623_100%)] text-lg font-black tracking-[0.08em] text-white">
                      A
                    </div>
                    <p className="text-[1.05rem] font-semibold uppercase tracking-[0.08em] text-[#0d5d96]">
                      {signatureDetails[0]}
                    </p>
                  </div>
                  <div className="space-y-1 text-[15px] leading-6 text-[#5d6777]">
                    {signatureDetails.slice(1).map((line, index) => (
                      <p key={`${line}-${index}`} className={index === signatureDetails.length - 2 ? "font-semibold text-[#0d5d96]" : ""}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[#dbe4f2] bg-[#fbfdff] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#314763]">Attachments</p>
                <p className="mt-1 text-xs text-[#7d8da6]">Limit: {attachmentLimitMb} MB total</p>
              </div>
              <label className="cursor-pointer rounded-[14px] border border-[#d7e0ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#4c6281]">
                Add files
                <input type="file" multiple className="hidden" onChange={handleAttachmentSelect} />
              </label>
            </div>

            {attachments.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.name}-${index}`}
                    className="flex items-center gap-3 rounded-full border border-[#d9e3f0] bg-white px-4 py-2 text-sm text-[#425773]"
                  >
                    <span className="max-w-[220px] truncate font-medium">{attachment.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-xs font-semibold text-[#b14a45]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="border-t border-[#f2d4d3] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b14a45]">{error}</p>
        ) : null}
      </div>
    </div>
  );
};

export default ComposeModal;
