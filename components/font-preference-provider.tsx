"use client";

import {
  createContext,
  startTransition,
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
  adobeFontsConfigured: boolean;
};

const FontPreferenceContext = createContext<FontPreferenceContextValue | null>(
  null,
);

const applyFontAttributes = (
  font: FontPreference,
  adobeFontsConfigured: boolean,
) => {
  document.documentElement.removeAttribute("data-tfl-type-profile");

  if (font === "p22" && adobeFontsConfigured) {
    document.documentElement.setAttribute("data-font", "p22");
    document.documentElement.setAttribute(
      "data-tfl-type-profile",
      "johnston-compatible",
    );
    return;
  }

  document.documentElement.removeAttribute("data-font");
};

/**
 * Site-wide body font switch (default Hammersmith One vs Adobe Fonts P22
 * Underground), persisted to localStorage.
 */
export const FontPreferenceProvider = ({
  children,
  adobeFontsConfigured,
}: {
  children: ReactNode;
  adobeFontsConfigured: boolean;
}) => {
  const [font, setFontState] = useState<FontPreference>("default");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialFont =
      stored === "p22" && adobeFontsConfigured ? "p22" : "default";
    startTransition(() => setFontState(initialFont));
    applyFontAttributes(initialFont, adobeFontsConfigured);
  }, [adobeFontsConfigured]);

  const setFont = (next: FontPreference) => {
    const selectedFont =
      next === "p22" && !adobeFontsConfigured ? "default" : next;
    setFontState(selectedFont);
    applyFontAttributes(selectedFont, adobeFontsConfigured);
    window.localStorage.setItem(STORAGE_KEY, selectedFont);
  };

  return (
    <FontPreferenceContext.Provider
      value={{
        font,
        setFont,
        adobeFontsConfigured,
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
