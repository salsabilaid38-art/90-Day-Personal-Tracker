export const APPLICATION_STATUSES = [
  'Planning',
  'In progress',
  'Submitted',
  'Decision received',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicationStep = {
  id: string;
  text: string;
  completed: boolean;
};

export type UniversityApplication = {
  id: string;
  name: string;
  deadline: string;
  status: ApplicationStatus;
  steps: ApplicationStep[];
};
