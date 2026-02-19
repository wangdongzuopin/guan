/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f9fe",
          100: "#e8f2fd",
          200: "#cfe5fb",
          300: "#aad2f6",
          400: "#82bff1",
          500: "#58abed",
          600: "#3f95d9",
          700: "#2f79b4",
          800: "#265f8d",
          900: "#214f74"
        },
        accent: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        surface: {
          50: "#ffffff",
          100: "#fafafa",
          200: "#f5f5f5",
          300: "#e5e5e5",
          400: "#d4d4d4"
        }
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0, 0, 0, 0.03), 0 15px 25px rgba(0, 0, 0, 0.04)",
        glow: "0 8px 30px rgba(88, 171, 237, 0.3)",
        "glow-lg": "0 10px 40px rgba(88, 171, 237, 0.38)",
        float: "0 20px 40px -10px rgba(0,0,0,0.1)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      }
    }
  },
  plugins: []
};
