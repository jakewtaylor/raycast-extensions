import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  kimaiUrl: string;
  kimaiApiToken: string;
}

export interface TimesheetEntry {
  id: number;
  begin: string;
  end: string | null;
  duration: number;
  description: string | null;
  project: number;
  activity: number;
  tags: string[];
  exported: boolean;
  billable: boolean;
}

export interface ActiveTimesheetEntry {
  id: number;
  begin: string;
  end: string | null;
  duration: number;
  description: string | null;
  project: { id: number; name: string };
  activity: { id: number; name: string };
  tags: string[];
  exported: boolean;
  billable: boolean;
}

export interface Activity {
  id: number;
  name: string;
  project: number | null;
  parentTitle: string | null;
  visible: boolean;
  billable: boolean;
  color: string | null;
}

function getBaseUrl(): string {
  const { kimaiUrl } = getPreferenceValues<Preferences>();
  return kimaiUrl.replace(/\/+$/, "");
}

function getHeaders(): Record<string, string> {
  const { kimaiApiToken } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${kimaiApiToken}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}/api${path}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Kimai API error ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getActiveTimesheets(): Promise<ActiveTimesheetEntry[]> {
  return request<ActiveTimesheetEntry[]>("/timesheets/active");
}

export interface Project {
  id: number;
  name: string;
  parentTitle: string | null;
  visible: boolean;
  billable: boolean;
  globalActivities: boolean;
  color: string | null;
}

export interface ActivityProjectPair {
  activity: Activity;
  project: Project;
}

export async function getActivities(): Promise<Activity[]> {
  return request<Activity[]>("/activities?visible=1");
}

export async function getProjects(): Promise<Project[]> {
  return request<Project[]>("/projects?visible=1");
}

export async function getActivityProjectPairs(): Promise<ActivityProjectPair[]> {
  const [activities, projects] = await Promise.all([getActivities(), getProjects()]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const pairs: ActivityProjectPair[] = [];

  for (const activity of activities) {
    if (activity.project) {
      // Project-specific activity — pair with its project
      const project = projectMap.get(activity.project);
      if (project) {
        pairs.push({ activity, project });
      }
    } else {
      // Global activity — pair with every project that allows global activities
      for (const project of projects) {
        if (project.globalActivities) {
          pairs.push({ activity, project });
        }
      }
    }
  }

  pairs.sort((a, b) => {
    const projCmp = a.project.name.localeCompare(b.project.name);
    if (projCmp !== 0) return projCmp;
    return a.activity.name.localeCompare(b.activity.name);
  });

  return pairs;
}

export async function startTimesheet(
  activityId: number,
  projectId: number,
  description?: string,
): Promise<TimesheetEntry> {
  return request<TimesheetEntry>("/timesheets", {
    method: "POST",
    body: JSON.stringify({
      activity: activityId,
      project: projectId,
      begin: new Date().toISOString(),
      description: description || undefined,
    }),
  });
}

export async function stopTimesheet(id: number): Promise<TimesheetEntry> {
  return request<TimesheetEntry>(`/timesheets/${id}/stop`, { method: "PATCH" });
}
