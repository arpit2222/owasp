// Shared types for project health calculations

export interface Project {
  id?: string;
  key?: string;
  name: string;
  level?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // Allow additional properties from the API response
  [key: string]: unknown;
}

export interface RepositorySummary {
  id: string;
  name: string;
  provider?: string;
  url?: string;
}

export interface IssueSummary {
  id: string;
  title: string;
  state?: string;
  url?: string;
  raw: any;
}

export interface MilestoneSummary {
  id: string;
  title: string;
  state?: string;
  dueOn?: string;
  raw: any;
}

export interface ReleaseSummary {
  id: string;
  tagName: string;
  name?: string;
  createdAt?: string;
  publishedAt?: string;
  url?: string;
  raw: any;
}

export interface RepositoryWithMeta extends RepositorySummary {
  issues: IssueSummary[];
  milestones: MilestoneSummary[];
  releases: ReleaseSummary[];
}
