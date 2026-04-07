import {
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ActiveTimesheetEntry, getActiveTimesheets, stopTimesheet } from "./api";

function formatElapsed(seconds: number, includeSeconds = true): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (!includeSeconds) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getElapsed(timer: ActiveTimesheetEntry): number {
  return Math.floor((Date.now() - new Date(timer.begin).getTime()) / 1000);
}

export default function Command() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimesheetEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchActive() {
      try {
        const active = await getActiveTimesheets();
        const timer = active.length > 0 ? active[0] : null;
        setActiveTimer(timer);
        setElapsed(timer ? getElapsed(timer) : 0);
      } catch {
        setActiveTimer(null);
        setElapsed(0);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActive();
  }, []);

  // Local tick to keep seconds incrementing in the dropdown
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (activeTimer) {
      tickRef.current = setInterval(() => {
        setElapsed(getElapsed(activeTimer));
      }, 1000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeTimer]);

  async function handleStop() {
    if (!activeTimer) return;
    try {
      await stopTimesheet(activeTimer.id);
      setActiveTimer(null);
      await showHUD("Timer stopped");
    } catch (error) {
      await showHUD(`Failed to stop timer: ${error}`);
    }
  }

  async function handleStartTimer() {
    try {
      await launchCommand({ name: "start-a-timer", type: LaunchType.UserInitiated });
    } catch {
      // command may not be available
    }
  }

  const title = activeTimer ? formatElapsed(elapsed, false) : undefined;
  const icon = activeTimer ? Icon.Clock : Icon.CircleDisabled;
  const tooltip = activeTimer ? `Kimai: Timer running — ${formatElapsed(elapsed)}` : "Kimai: No active timer";

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={tooltip} isLoading={isLoading}>
      {activeTimer ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title={`Running: ${formatElapsed(elapsed)}`} icon={Icon.Clock} />
            <MenuBarExtra.Item title={activeTimer.project.name} icon={Icon.Folder} />
            <MenuBarExtra.Item title={activeTimer.activity.name} icon={Icon.Hammer} />
            {activeTimer.description ? (
              <MenuBarExtra.Item title={activeTimer.description} icon={Icon.BulletPoints} />
            ) : null}
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Stop Timer" icon={Icon.Stop} onAction={handleStop} />
            <MenuBarExtra.Item
              title="Open Kimai"
              icon={Icon.Globe}
              onAction={async () => {
                const { kimaiUrl } = getPreferenceValues<{ kimaiUrl: string }>();
                await open(kimaiUrl);
              }}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="No active timer" icon={Icon.CircleDisabled} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Start a Timer" icon={Icon.Play} onAction={handleStartTimer} />
          </MenuBarExtra.Section>
        </>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences..." icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
