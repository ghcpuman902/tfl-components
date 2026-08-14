/** Browser event to open the site-wide feedback dialog from any client surface. */
export const OPEN_FEEDBACK_EVENT = "tfl-open-feedback";

export const openFeedbackDialog = () => {
  window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT));
};
