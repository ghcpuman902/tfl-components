"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontPreference = "default" | "p22";

const STORAGE_KEY = "tfl-font-pref";

type FontPreferenceContextValue = {
  font: FontPreference;
  setFont: (font: FontPreference) => void;
  /** Whether an Adobe Fonts kit was configured server-side (`NEXT_PUBLIC_ADOBE_FONTS_KIT_ID`). */
  adobeFontsConfigured: boolean;
};

const FontPreferenceContext = createContext<FontPreferenceContextValue | null>(
  null,
);

const applyFontAttribute = (font: FontPreference) => {
  if (font === "p22") {
    document.documentElement.setAttribute("data-font", "p22");
  } else {
    document.documentElement.removeAttribute("data-font");
  }
};

/**
 * Site-wide body font switch (default Hammersmith One vs Adobe Fonts P22
 * Underground), persisted to localStorage. Applies a `data-font` attribute
 * on `<html>` so `--font-sans` — and everything that inherits it — follows,
 * without waiting for a client re-render on every route.
 */
export const FontPreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [font, setFontState] = useState<FontPreference>("default");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "p22") {
      setFontState("p22");
      applyFontAttribute("p22");
    }
  }, []);

  const setFont = (next: FontPreference) => {
    setFontState(next);
    applyFontAttribute(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <FontPreferenceContext.Provider
      value={{
        font,
        setFont,
        adobeFontsConfigured: Boolean(
          process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID,
        ),
      }}
    >
      {children}
    </FontPreferenceContext.Provider>
  );
};

export const useFontPreference = (): FontPreferenceContextValue => {
  const context = useContext(FontPreferenceContext);
  if (!context) {
    throw new Error(
      "useFontPreference must be used within FontPreferenceProvider",
    );
  }
  return context;
};
