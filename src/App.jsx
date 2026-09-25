import { useState } from "react";
import "./index.css";

function App() {
  const [isSignup, setIsSignup] = useState(false);
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");

  const handleContinue = (e) => {
    e.preventDefault();

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    if (isSignup && !name) {
      setMessage("Please enter your name.");
      return;
    }

    setMessage("");
    setStep("otp");
  };

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    setMessage("");
    setStep("success");
  };

  const handleBack = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
  };

  const handleSwitch = () => {
    setIsSignup(!isSignup);
    setStep("email");
    setEmail("");
    setName("");
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
  };

  return (
    <div className="auth-page">

      {/* Background */}
      <div className="grid-background"></div>

      <div className="orb orb-one"></div>
      <div className="orb orb-two"></div>
      <div className="orb orb-three"></div>

      {/* Top Bar */}
      <header className="topbar">
        <div className="mini-logo">E</div>

        <div className="top-status">
          <span className="status-dot"></span>
          PRIVATE LIFE OS
        </div>
      </header>

      {/* Main */}
      <main className="auth-layout">

        {/* Hero */}
        <section className="hero-section">

          <div className="hero-small">
            YOUR LIFE. ONE SYSTEM.
          </div>

          <h1>
            Welcome to
            <span> EMPAIR.</span>
          </h1>

          <p>
            Your personal operating system for your
            journey, memories, goals, money and life.
          </p>

          <div className="hero-line"></div>

          <div className="feature-list">

            <div className="feature-item">
              <span>01</span>
              Your Journey
            </div>

            <div className="feature-item">
              <span>02</span>
              Your Goals
            </div>

            <div className="feature-item">
              <span>03</span>
              Your Memories
            </div>

          </div>

          <div className="hero-footer">
            <span>PRIVATE BY DESIGN</span>
            <span>•</span>
            <span>BUILT FOR REAL LIFE</span>
          </div>

        </section>

        {/* Authentication */}
        <section className="auth-section">

          <div className="auth-panel">

            {/* Logo */}
            <div className="panel-top">

              <div className="big-e">
                E
              </div>

              <div className="brand-info">

                <div className="panel-brand">
                  EMPAIR
                </div>

                <div className="panel-version">
                  PERSONAL LIFE OS · v0.1
                </div>

              </div>

            </div>


            {/* EMAIL STEP */}
            {step === "email" && (
              <>
                <div className="auth-heading">

                  <h2>
                    {isSignup
                      ? "Create your space."
                      : "Enter your space."}
                  </h2>

                  <p>
                    {isSignup
                      ? "Start building your personal life system."
                      : "Continue where you left off."}
                  </p>

                </div>

                <form onSubmit={handleContinue}>

                  {isSignup && (
                    <div className="field">

                      <label htmlFor="name">
                        NAME
                      </label>

                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />

                    </div>
                  )}

                  <div className="field">

                    <label htmlFor="email">
                      EMAIL
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />

                  </div>

                  {message && (
                    <div className="error-message">
                      {message}
                    </div>
                  )}

                  <button
                    className="continue-button"
                    type="submit"
                  >
                    <span>
                      {isSignup
                        ? "CREATE ACCOUNT"
                        : "CONTINUE"}
                    </span>

                    <span className="arrow">
                      →
                    </span>
                  </button>

                </form>

                <div className="divider">
                  <span></span>
                  <small>OR</small>
                  <span></span>
                </div>

                <button
                  className="switch-auth"
                  type="button"
                  onClick={handleSwitch}
                >
                  {isSignup
                    ? "Already have an account? Login"
                    : "New to EMPAIR? Create an account"}
                </button>

                <div className="privacy-note">

                  <div className="privacy-icon">
                    🔒
                  </div>

                  <div>
                    <strong>
                      PRIVATE BY DESIGN
                    </strong>

                    <p>
                      Your personal information stays
                      private and protected.
                    </p>
                  </div>

                </div>
              </>
            )}


            {/* OTP STEP */}
            {step === "otp" && (
              <div className="otp-screen">

                <button
                  className="back-button"
                  type="button"
                  onClick={handleBack}
                >
                  ← Back
                </button>

                <div className="otp-icon">
                  ✉
                </div>

                <div className="auth-heading">

                  <h2>
                    Verify your email.
                  </h2>

                  <p>
                    Enter the 6-digit verification code
                    sent to
                    <strong> {email}</strong>
                  </p>

                </div>

                <form onSubmit={handleVerify}>

                  <div className="otp-container">

                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) =>
                          handleOtpChange(
                            e.target.value,
                            index
                          )
                        }
                      />
                    ))}

                  </div>

                  {message && (
                    <div className="error-message">
                      {message}
                    </div>
                  )}

                  <button
                    className="continue-button"
                    type="submit"
                  >
                    <span>
                      VERIFY OTP
                    </span>

                    <span className="arrow">
                      →
                    </span>
                  </button>

                </form>

                <div className="resend-area">
                  Didn't receive the code?
                  <button
                    type="button"
                    onClick={() =>
                      setMessage("A new OTP will be sent once backend is connected.")
                    }
                  >
                    Resend OTP
                  </button>
                </div>

              </div>
            )}


            {/* SUCCESS STEP */}
            {step === "success" && (
              <div className="success-screen">

                <div className="success-icon">
                  ✓
                </div>

                <div className="auth-heading">

                  <h2>
                    You're verified.
                  </h2>

                  <p>
                    Welcome to your personal life system,
                    <strong> {name || "Uttakala"}</strong>.
                  </p>

                </div>

                <div className="success-box">

                  <span>
                    ✓
                  </span>

                  <div>
                    <strong>
                      EMAIL VERIFIED
                    </strong>

                    <p>
                      Authentication successful.
                    </p>
                  </div>

                </div>

                <button
                  className="continue-button"
                  type="button"
                  onClick={() => alert("Dashboard coming in v0.2 🚀")}
                >
                  <span>
                    ENTER EMPAIR
                  </span>

                  <span className="arrow">
                    →
                  </span>
                </button>

              </div>
            )}

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="bottom-bar">

        <span>
          © 2026 EMPAIR
        </span>

        <span className="created-by">
          CREATED BY <strong>UTTAKALA</strong>
        </span>

        <span>
          BUILT FOR REAL LIFE
        </span>

      </footer>

    </div>
  );
}

export default App;