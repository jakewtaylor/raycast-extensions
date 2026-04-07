import { Action, ActionPanel, Form, showToast, Toast, popToRoot, LaunchType, launchCommand } from "@raycast/api";
import { useEffect, useState } from "react";
import { Activity, Project, getActivityProjectPairs, getActiveTimesheets, startTimesheet } from "./api";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activitiesByProject, setActivitiesByProject] = useState<Map<number, Activity[]>>(new Map());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveTimer, setHasActiveTimer] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pairs, active] = await Promise.all([getActivityProjectPairs(), getActiveTimesheets()]);

        // Build unique projects list and activities-by-project map
        const projMap = new Map<number, Project>();
        const actMap = new Map<number, Activity[]>();
        for (const { activity, project } of pairs) {
          projMap.set(project.id, project);
          if (!actMap.has(project.id)) actMap.set(project.id, []);
          actMap.get(project.id)!.push(activity);
        }

        setProjects([...projMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
        setActivitiesByProject(actMap);

        if (active.length > 0) {
          setHasActiveTimer(true);
          await showToast({
            style: Toast.Style.Failure,
            title: "A timer is already running",
            message: "Stop the current timer before starting a new one.",
          });
        }
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load data", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const currentActivities = selectedProjectId ? activitiesByProject.get(Number(selectedProjectId)) ?? [] : [];

  async function handleSubmit(values: { projectId: string; activityId: string; description: string }) {
    if (hasActiveTimer) {
      await showToast({
        style: Toast.Style.Failure,
        title: "A timer is already running",
        message: "Stop the current timer before starting a new one.",
      });
      return;
    }

    if (!values.projectId || !values.activityId) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a project and activity" });
      return;
    }

    try {
      await startTimesheet(Number(values.activityId), Number(values.projectId), values.description);
      await showToast({ style: Toast.Style.Success, title: "Timer started" });

      try {
        await launchCommand({ name: "active-timer", type: LaunchType.Background });
      } catch {
        // menu bar command may not be active
      }

      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to start timer", message: String(error) });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project" storeValue onChange={setSelectedProjectId}>
        <Form.Dropdown.Item value="" title="Select a project…" />
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={String(project.id)} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="activityId" title="Activity" storeValue>
        {!selectedProjectId ? (
          <Form.Dropdown.Item value="" title="Select a project first" />
        ) : (
          currentActivities.map((activity) => (
            <Form.Dropdown.Item key={activity.id} value={String(activity.id)} title={activity.name} />
          ))
        )}
      </Form.Dropdown>
      <Form.TextField id="description" title="Description" placeholder="What are you working on?" />
    </Form>
  );
}
