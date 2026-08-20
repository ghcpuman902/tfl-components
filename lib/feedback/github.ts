import { GITHUB_COMPARE, GITHUB_ISSUES_NEW, GITHUB_REPO } from "./constants"

export const buildGitHubIssueUrl = (input: {
  pageUrl: string
  pageTitle: string
}): string => {
  const title = input.pageTitle
    ? `Feedback: ${input.pageTitle}`
    : "Feedback from docs site"
  const body = [
    "## Context",
    "",
    `- Page: ${input.pageUrl}`,
    `- Title: ${input.pageTitle || "(none)"}`,
    "",
    "## What happened / what should change",
    "",
    "<!-- Describe the bug or suggestion -->",
    "",
  ].join("\n")

  const params = new URLSearchParams({
    title,
    body,
  })
  return `${GITHUB_ISSUES_NEW}?${params.toString()}`
}

export const buildGitHubPrUrl = (): string => GITHUB_COMPARE

export { GITHUB_REPO }
