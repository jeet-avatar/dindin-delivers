export type Theme = "live" | "classic";

export const THEME_STORAGE_KEY = "beatmind-theme";

// Runs in <head> before first paint so a saved Classic choice never flashes the Live colours.
export const THEME_BOOT_SCRIPT =
  `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="classic")document.documentElement.dataset.theme="classic"}catch(e){}`;
