/** Browser event to open the site-wide feedback dialog from any client surface. */
export const OPEN_FEEDBACK_EVENT = "tfl-open-feedback"

export type OpenFeedbackDetail = {
  /** Capture the viewport. Defaults to true. */
  screenshot?: boolean
}

export const openFeedbackDialog = (detail: OpenFeedbackDetail = {}) => {
  window.dispatchEvent(
    new CustomEvent<OpenFeedbackDetail>(OPEN_FEEDBACK_EVENT, {
      detail: { screenshot: detail.screenshot ?? true },
    })
  )
}
