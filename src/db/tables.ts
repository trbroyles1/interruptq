/**
 * Re-exports all table objects from the correct schema based on DB_DRIVER.
 * Consumer files should import tables from here instead of directly from schema files.
 */
import { getDbDriver } from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tables: any =
  getDbDriver() === "postgres"
    ? await import("./schema.pg")
    : await import("./schema");

export const identities = tables.identities;
export const shareLinks = tables.shareLinks;
export const sprints = tables.sprints;
export const activities = tables.activities;
export const sprintGoalSnapshots = tables.sprintGoalSnapshots;
export const prioritySnapshots = tables.prioritySnapshots;
export const onCallChanges = tables.onCallChanges;
export const knownTags = tables.knownTags;
export const preferences = tables.preferences;
