"use client";

import type { ReactNode } from "react";

export const TFL_API_PORTAL_URL = "https://api-portal.tfl.gov.uk/";
export const TFL_API_PORTAL_PRODUCTS_URL = `${TFL_API_PORTAL_URL}products`;
export const TFL_API_PORTAL_PROFILE_URL = `${TFL_API_PORTAL_URL}profile`;

type TflPortalLinkProps = {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

const TflPortalLink = ({
  href,
  children,
  onClick,
  className = "text-foreground underline underline-offset-2",
}: TflPortalLinkProps) => (
  <a
    href={href}
    className={className}
    target="_blank"
    rel="noreferrer"
    onClick={onClick}
  >
    {children}
  </a>
);

/** Shared “get a key” sentence used by the credentials dialog and Board. */
export const TflApiKeyObtainLinks = ({
  onNavigate,
}: {
  onNavigate?: () => void;
}) => (
  <>
    <TflPortalLink href={TFL_API_PORTAL_PRODUCTS_URL} onClick={onNavigate}>
      Obtain a free key
    </TflPortalLink>{" "}
    (subscribe to 500 Requests per min), then copy it from{" "}
    <TflPortalLink href={TFL_API_PORTAL_PROFILE_URL} onClick={onNavigate}>
      Profile / Show
    </TflPortalLink>
  </>
);

/** Filled-state note under an active key — keep identical across surfaces. */
export const TflApiKeyPortalNote = () => (
  <p className="text-xs text-muted-foreground">
    On the portal you’ll see two keys (Primary and Secondary); either works.{" "}
    <code className="text-[0.7rem]">app_id</code> has been unused since Jan
    2021.
  </p>
);

/** Field helper under the TfL API key input — keep identical across surfaces. */
export const TflApiKeyFieldHint = ({ id }: { id: string }) => (
  <p id={id} className="text-xs text-muted-foreground">
    Copy from{" "}
    <TflPortalLink
      href={TFL_API_PORTAL_PROFILE_URL}
      className="underline underline-offset-2"
    >
      Profile / Show
    </TflPortalLink>
    . Primary or Secondary both work.{" "}
    <code className="text-[0.7rem]">app_id</code> has been unused since Jan
    2021.
  </p>
);
