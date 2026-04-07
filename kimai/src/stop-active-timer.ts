import { showHUD, showToast, Toast, LaunchType, launchCommand } from "@raycast/api";
import { getActiveTimesheets, stopTimesheet } from "./api";

export default async function Command() {
  try {
    const active = await getActiveTimesheets();

    if (active.length === 0) {
      await showHUD("No active timer to stop");
      return;
    }

    await stopTimesheet(active[0].id);
    await showHUD("Timer stopped");

    try {
      await launchCommand({ name: "active-timer", type: LaunchType.Background });
    } catch {
      // menu bar command may not be active
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to stop timer", message: String(error) });
  }
}
