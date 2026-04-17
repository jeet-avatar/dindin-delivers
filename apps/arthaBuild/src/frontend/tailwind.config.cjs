module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chatbg: '#0b1020',
        panel: '#0f1724'
      },
      // fontFamily: {
      //   sans: ['Inter', 'sans-serif'],
      //   mono: ['Fira Code', 'monospace'],
      // },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        blob: "blob 10s infinite",
      },
    },
  },
  plugins: [],
};
