// Until the first route commits, the static route shell in index.html is the
// page. Setting app-ready hides that shell and reveals the React app.
const APP_READY_CLASS = "app-ready";

export const isAppReady = () =>
  document.documentElement.classList.contains(APP_READY_CLASS);

export const markAppReady = () => {
  document.documentElement.classList.add(APP_READY_CLASS);
};
