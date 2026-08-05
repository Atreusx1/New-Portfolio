/**
 * Contact.tsx: redesigned.
 *
 * Inputs get floating labels + focus rings + inline validation; submit
 * plays a drawn-check success animation, then POSTs to /api/send-email
 * (a Vercel serverless function using nodemailer/Gmail SMTP).
 * Links keep their identity but read in Inter, not mono.
 */
import { useState, FormEvent } from "react";
import { Github, Linkedin, Mail, ArrowUpRight } from "lucide-react";
import { RESUME } from "../data/constants";
import { useTheme } from "../context/ThemeContext";
import { Reveal, RevealScramble } from "./motion/Reveal";
import { Magnetic } from "./motion/Magnetic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  message: string;
}

type FieldKey = keyof FormState;

export const Contact = () => {
  const t = useTheme();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const links = [
    { icon: Github, label: "GitHub", url: RESUME.github, handle: "@Atreusx1" },
    {
      icon: Linkedin,
      label: "LinkedIn",
      url: RESUME.linkedin,
      handle: "Anish Kadam",
    },
    {
      icon: Mail,
      label: "Email",
      url: `mailto:${RESUME.email}`,
      handle: RESUME.email,
    },
  ] as const;

  const set =
    (key: FieldKey) =>
    (value: string): void => {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    };

  const validate = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!form.name.trim()) next.name = "Add your name";
    if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email";
    if (form.message.trim().length < 8) next.message = "Say a little more";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitMessage = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    setServerError(null);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `Portfolio enquiry from ${form.name}`,
          message: form.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Something went wrong");
      }

      setSent(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Couldn't send. Try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="section">
      <div className="container">
        <Reveal className="section-head">
          <span className="mono-label">Contact</span>
          <h2 className="section-title">
            {/* Gated on the Reveal *and* the boot screen: see Reveal.tsx. */}
            <RevealScramble text="Let's build something" speed={20} />
          </h2>
        </Reveal>

        <div className="grid-2">
          {/* Left: channels */}
          <Reveal delay={0.06}>
            <p className="body-text" style={{ marginBottom: "2rem" }}>
              Open to new opportunities, collaborations, and good conversations.
              Pick whichever channel suits you.
            </p>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.95rem 0.25rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    color: "inherit",
                    borderRadius: "6px",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.9rem",
                    }}
                  >
                    <link.icon size={15} style={{ color: t.fg_(0.35) }} />
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "0.7rem",
                          fontWeight: 550,
                          color: t.fg_(0.4),
                          marginBottom: "0.05rem",
                        }}
                      >
                        {link.label}
                      </div>
                      <div
                        className="data-text"
                        style={{ fontSize: "0.75rem", color: t.fg_(0.75) }}
                      >
                        {link.handle}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight size={13} style={{ color: t.fg_(0.25) }} />
                </a>
              ))}
            </div>

            <div style={{ marginTop: "1.75rem" }}>
              <Magnetic strength={7}>
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  View Resume <ArrowUpRight size={12} />
                </a>
              </Magnetic>
            </div>
          </Reveal>

          {/* Right: form */}
          <Reveal delay={0.14}>
            {sent ? (
              <SuccessState accent={t.accent} fg={t.fg} fgDim={t.fg_(0.55)} />
            ) : (
              <form
                onSubmit={submitMessage}
                noValidate
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.8rem",
                }}
              >
                <Field
                  id="contact-name"
                  label="Name"
                  value={form.name}
                  error={errors.name}
                  onChange={set("name")}
                />
                <Field
                  id="contact-email"
                  label="Email"
                  type="email"
                  value={form.email}
                  error={errors.email}
                  onChange={set("email")}
                />
                <Field
                  id="contact-message"
                  label="Message"
                  value={form.message}
                  error={errors.message}
                  onChange={set("message")}
                  rows={5}
                />
                <Magnetic strength={6} style={{ alignSelf: "flex-start" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending}
                  >
                    {sending ? "Sending…" : "Send message"}{" "}
                    <ArrowUpRight size={13} />
                  </button>
                </Magnetic>
                {serverError && (
                  <div
                    role="alert"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.75rem",
                      color: "var(--neg)",
                      paddingLeft: "0.25rem",
                    }}
                  >
                    {serverError}
                  </div>
                )}
              </form>
            )}
          </Reveal>
        </div>
      </div>

      <style>{`.contact-link:hover { background: var(--border-faint); }`}</style>
    </section>
  );
};

// ── Floating-label field ──────────────────────────────────────────────────────
const Field = ({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  rows,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  type?: string;
  rows?: number;
}) => (
  <div>
    <div
      className={`field ${value ? "field-filled" : ""} ${error ? "field-error" : ""}`}
    >
      {rows ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      )}
      <label htmlFor={id}>{label}</label>
    </div>
    {error && (
      <div
        id={`${id}-err`}
        role="alert"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.7rem",
          color: "var(--neg)",
          marginTop: "0.3rem",
          paddingLeft: "0.25rem",
          animation: "fadeIn 0.25s ease",
        }}
      >
        {error}
      </div>
    )}
  </div>
);

// ── Success animation: a check that draws itself ─────────────────────────────
const SuccessState = ({
  accent,
  fg,
  fgDim,
}: {
  accent: string;
  fg: string;
  fgDim: string;
}) => (
  <div
    className="card"
    role="status"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "300px",
      gap: "1.1rem",
      animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}
  >
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle
        cx="28"
        cy="28"
        r="25"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.35"
      />
      <path
        d="M17 29 l8 8 l15 -17"
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40"
        strokeDashoffset="40"
        style={{
          animation: "drawCheck 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s forwards",
        }}
      />
    </svg>
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "1.1rem",
        fontWeight: 600,
        letterSpacing: "-0.015em",
        color: fg,
      }}
    >
      Message Sent!
    </div>
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.8rem",
        color: fgDim,
        textAlign: "center",
        maxWidth: "32ch",
      }}
    >
      Thanks for reaching out. I'll get back to you soon.
    </div>
  </div>
);
