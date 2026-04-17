import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Logo from "../components/Logo";
import MotionButton from "../components/MotionButton";
import { useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function SignUp() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    organizationName: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nav = useNavigate();

  const FREE_EMAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
    "hotmail.com", "hotmail.co.uk", "outlook.com", "live.com", "msn.com",
    "icloud.com", "me.com", "mac.com", "aol.com", "aim.com",
    "protonmail.com", "proton.me", "mail.com", "email.com", "inbox.com",
    "yandex.com", "zoho.com", "gmx.com", "gmx.net", "qq.com", "163.com",
    "fastmail.com", "rediffmail.com",
  ]);

  function isFreeEmail(email: string): boolean {
    const domain = email.toLowerCase().split("@")[1] || "";
    return FREE_EMAIL_DOMAINS.has(domain);
  }

  function validate() {
    const newErrors: { [key: string]: string } = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      newErrors.email = "Valid email is required";
    else if (isFreeEmail(form.email))
      newErrors.email = "Please use your company email. Gmail, Yahoo, and other free providers are not accepted.";
    if (!form.organizationName.trim())
      newErrors.organizationName = "Organization name is required";
    if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (form.confirmPassword !== form.password)
      newErrors.confirmPassword = "Passwords do not match";
    if (!form.acceptTerms) newErrors.acceptTerms = "You must accept the terms";
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    // Simulate API
    try {
      const result = await register({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        organization: form.organizationName,
        password: form.password,
      });

      if (result) {
        nav("/signup-success");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function getPasswordStrength(password: string) {
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score === 0) return { label: "", color: "" };
    if (score === 1) return { label: "Weak", color: "bg-red-500" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-500" };
    if (score === 3) return { label: "Good", color: "bg-blue-500" };
    return { label: "Strong", color: "bg-green-500" };
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center w-full max-w-sm sm:max-w-md"
      >
        {/* Logo */}
        <div className="mb-6">
          <Logo />
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="w-full p-8 flex flex-col gap-4 bg-panel rounded-2xl shadow-xl"
        >
          <h1 className="text-2xl font-semibold text-center">Sign Up</h1>

          {/* First & Last Name */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.firstName && (
                <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
            <div className="flex-1">
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.lastName && (
                <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Organization */}
          <div>
            <input
              type="text"
              name="organizationName"
              placeholder="Organization name"
              value={form.organizationName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.organizationName && (
              <p className="text-red-400 text-xs mt-1">
                {errors.organizationName}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-10 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Strength indicator BELOW input, not inside */}
            {form.password && (
              <div className="mt-2">
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-2 ${getPasswordStrength(form.password).color}`}
                    style={{
                      width: `${
                        getPasswordStrength(form.password).label === "Weak"
                          ? 25
                          : getPasswordStrength(form.password).label === "Fair"
                          ? 50
                          : getPasswordStrength(form.password).label === "Good"
                          ? 75
                          : 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs mt-1 text-gray-400">
                  Strength:{" "}
                  <span
                    className={`font-medium ${getPasswordStrength(form.password).color.replace(
                      "bg-",
                      "text-"
                    )}`}
                  >
                    {getPasswordStrength(form.password).label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-10 bg-slate-800 rounded-full border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400"
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Validation error below input */}
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Accept Terms */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={form.acceptTerms}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-400">
              I accept the{" "}
              <a href="/terms" className="text-indigo-400 hover:underline">
                Terms of Use
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-indigo-400 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-red-400 text-xs">{errors.acceptTerms}</p>
          )}

          {/* Submit */}
          <MotionButton
            type="submit"
            loading={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Create Account
          </MotionButton>
        </motion.form>
      </motion.div>
    </div>
  );
}