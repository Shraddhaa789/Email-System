import { useMemo, useState } from "react";
import axios from "axios";

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

const ComposeModal = ({
  initialValues,
  modeLabel = "New message",
  onClose,
  onSaved,
  settings,
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
  const [body, setBody] = useState(withSignature(initialValues?.body || "", defaultSignature));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const sendEmail = async () => {
    setError("");
    setIsSending(true);

    try {
      await axios.post(
        "http://localhost:5000/api/email/send",
        { to, cc, bcc, subject, body },
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
        "http://localhost:5000/api/email/draft",
        { to, cc, bcc, subject, body },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#13233f]/18 p-4 backdrop-blur-[6px]">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-[#fdfefe] p-6 shadow-[0_28px_80px_rgba(16,35,63,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#7c8ba5]">
              Compose
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#16253d]">
              {modeLabel}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-[#eef3fa] px-4 py-2 text-sm font-semibold text-[#6b7b93]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <input
            value={to}
            placeholder="To"
            className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
            onChange={(event) => setTo(event.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={cc}
              placeholder="Cc"
              className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              onChange={(event) => setCc(event.target.value)}
            />

            <input
              value={bcc}
              placeholder="Bcc"
              className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
              onChange={(event) => setBcc(event.target.value)}
            />
          </div>

          <input
            value={subject}
            placeholder="Subject line"
            className="h-12 rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-4 text-[15px] text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
            onChange={(event) => setSubject(event.target.value)}
          />

          <textarea
            value={body}
            placeholder="Write your message"
            rows={10}
            className="min-h-[280px] rounded-[22px] border border-[#d7e0ee] bg-[#f7fafe] px-4 py-4 text-[15px] leading-7 text-[#21314d] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb9e1] focus:bg-white"
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-[#b14a45]">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={sendEmail}
            disabled={isSending}
            className="rounded-[16px] bg-[#2473c1] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(36,115,193,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send message"}
          </button>

          <button
            onClick={saveDraft}
            disabled={isSending}
            className="rounded-[16px] border border-[#d7e0ee] bg-[#f7fafe] px-5 py-3 text-sm font-semibold text-[#63748f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save draft
          </button>

          <button
            onClick={onClose}
            className="rounded-[16px] border border-[#d7e0ee] bg-white px-5 py-3 text-sm font-semibold text-[#6b7b93]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
