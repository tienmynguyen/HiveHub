function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesLoose(haystack, needle) {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  return Boolean(n) && h.includes(n);
}

function scoreByTokenOverlap(source, query) {
  const srcTokens = normalizeText(source).split(/\s+/).filter(Boolean);
  const qTokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!srcTokens.length || !qTokens.length) return 0;
  let hit = 0;
  for (const t of qTokens) {
    if (srcTokens.includes(t)) hit += 1;
  }
  return hit / qTokens.length;
}

function extractQuoted(text) {
  const m = String(text || "").match(/["“](.+?)["”]/);
  return m?.[1] ? m[1].trim() : "";
}

function extractAfterKeywords(text, keywordsRegex) {
  const m = String(text || "").match(keywordsRegex);
  return m?.[1] ? m[1].trim() : "";
}

function getUserProjectIds(db, userId) {
  return db.userProjects
    .filter((up) => Number(up.userId) === Number(userId))
    .map((up) => String(up.projectId));
}

function resolveProjectFromText(db, userId, commandText, explicitProjectId) {
  const userProjectIds = getUserProjectIds(db, userId);
  if (!userProjectIds.length) return null;

  const inScopeProjects = db.projects.filter((p) => userProjectIds.includes(String(p.project_id)));

  if (explicitProjectId) {
    const found = inScopeProjects.find((p) => String(p.project_id).toUpperCase() === String(explicitProjectId).toUpperCase());
    return found ? { projectId: String(found.project_id), projectName: found.projectName, confidence: 1 } : null;
  }

  const pidMatch = String(commandText || "").match(/p-\d{6,}/i);
  if (pidMatch?.[0]) {
    const found = inScopeProjects.find((p) => String(p.project_id).toUpperCase() === pidMatch[0].toUpperCase());
    if (found) return { projectId: String(found.project_id), projectName: found.projectName, confidence: 1 };
  }

  const quoted = extractQuoted(commandText);
  const candidateByKeyword =
    extractAfterKeywords(commandText, /(?:du an|dự án|project)\s*(?:ten|name)?\s*[:\-]?\s*([^\n,.;]+)/i) || quoted;

  if (candidateByKeyword) {
    const exact = inScopeProjects.find((p) => normalizeText(p.projectName) === normalizeText(candidateByKeyword));
    if (exact) return { projectId: String(exact.project_id), projectName: exact.projectName, confidence: 0.95 };

    const loose = inScopeProjects.find((p) => includesLoose(p.projectName, candidateByKeyword));
    if (loose) return { projectId: String(loose.project_id), projectName: loose.projectName, confidence: 0.8 };

    const scored = inScopeProjects
      .map((p) => ({ p, score: scoreByTokenOverlap(p.projectName, candidateByKeyword) }))
      .sort((a, b) => b.score - a.score);
    const candidates = scored
      .filter((x) => x.score >= 0.35)
      .slice(0, 5)
      .map((x) => ({
        projectId: String(x.p.project_id),
        projectName: x.p.projectName,
        score: Number(x.score.toFixed(2)),
      }));
    if (candidates.length > 1) {
      return {
        projectId: null,
        projectName: null,
        confidence: 0,
        ambiguous: true,
        candidates,
      };
    }
    if (scored[0] && scored[0].score >= 0.6) {
      return {
        projectId: String(scored[0].p.project_id),
        projectName: scored[0].p.projectName,
        confidence: Math.min(0.9, 0.6 + scored[0].score * 0.3),
      };
    }
  }

  // If user belongs to only one project, treat as default context.
  if (inScopeProjects.length === 1) {
    const only = inScopeProjects[0];
    return { projectId: String(only.project_id), projectName: only.projectName, confidence: 0.6 };
  }

  return null;
}

function resolveStoryFromText(db, projectId, commandText, explicitStoryId) {
  const projectStories = db.stories.filter((s) => String(s.project_id) === String(projectId));
  if (!projectStories.length) return null;

  if (explicitStoryId) {
    const found = projectStories.find((s) => Number(s.story_id) === Number(explicitStoryId));
    if (found) return { storyId: Number(found.story_id), storyName: found.storyName, confidence: 1 };
  }

  const idMatch = String(commandText || "").match(/story\s*#?\s*(\d+)/i);
  if (idMatch?.[1]) {
    const found = projectStories.find((s) => Number(s.story_id) === Number(idMatch[1]));
    if (found) return { storyId: Number(found.story_id), storyName: found.storyName, confidence: 1 };
  }

  const named = extractAfterKeywords(commandText, /(?:story)\s*(?:ten|name)?\s*[:\-]?\s*([^\n,.;]+)/i) || extractQuoted(commandText);
  if (named) {
    const exact = projectStories.find((s) => normalizeText(s.storyName) === normalizeText(named));
    if (exact) return { storyId: Number(exact.story_id), storyName: exact.storyName, confidence: 0.92 };
    const loose = projectStories.find((s) => includesLoose(s.storyName, named));
    if (loose) return { storyId: Number(loose.story_id), storyName: loose.storyName, confidence: 0.78 };
  }
  return null;
}

function resolveSprintFromText(db, projectId, commandText, explicitSprintId) {
  const sprints = db.sprints.filter((s) => String(s.project_id) === String(projectId));
  if (!sprints.length) return null;

  if (explicitSprintId) {
    const found = sprints.find((s) => Number(s.sprint_id) === Number(explicitSprintId));
    if (found) return { sprintId: Number(found.sprint_id), sprintName: found.sprintName, confidence: 1 };
  }

  const idMatch = String(commandText || "").match(/sprint\s*#?\s*(\d+)/i);
  if (idMatch?.[1]) {
    const found = sprints.find((s) => Number(s.sprint_id) === Number(idMatch[1]));
    if (found) return { sprintId: Number(found.sprint_id), sprintName: found.sprintName, confidence: 1 };
  }
  return null;
}

function resolveContextFromDatabase({ db, userId, commandText, payload }) {
  const safePayload = payload || {};
  const projectResolved = resolveProjectFromText(db, userId, commandText, safePayload.projectId);
  const projectId = projectResolved?.projectId || safePayload.projectId;

  const storyResolved = projectId
    ? resolveStoryFromText(db, projectId, commandText, safePayload.storyId)
    : null;
  const sprintResolved = projectId
    ? resolveSprintFromText(db, projectId, commandText, safePayload.sprintId)
    : null;

  return {
    projectId: projectResolved?.projectId || safePayload.projectId,
    projectName: projectResolved?.projectName || safePayload.projectName,
    projectCandidates: projectResolved?.ambiguous ? projectResolved?.candidates || [] : [],
    projectResolutionStatus: projectResolved?.ambiguous ? "AMBIGUOUS" : projectResolved?.projectId ? "RESOLVED" : "UNRESOLVED",
    storyId: storyResolved?.storyId || safePayload.storyId,
    storyName: storyResolved?.storyName || safePayload.storyName,
    sprintId: sprintResolved?.sprintId || safePayload.sprintId,
    sprintName: sprintResolved?.sprintName || safePayload.sprintName,
    resolverConfidence: Math.max(
      projectResolved?.confidence || 0,
      storyResolved?.confidence || 0,
      sprintResolved?.confidence || 0
    ),
  };
}

module.exports = {
  resolveContextFromDatabase,
};
