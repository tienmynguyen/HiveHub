const { ensureScrumSchema, nextNumericId } = require("../data/db");

function getUserRoleInProject(db, projectId, userId) {
  const link = db.userProjects.find(
    (x) => String(x.projectId) === String(projectId) && Number(x.userId) === Number(userId)
  );
  return link ? Number(link.roleId) : null;
}

function isOwner(db, projectId, userId) {
  return getUserRoleInProject(db, projectId, userId) === 3;
}

function roleName(roleId) {
  if (Number(roleId) === 3) return "Owner";
  if (Number(roleId) === 2) return "Leader";
  return "Member";
}

function findUsersByProject(db, projectId) {
  const links = db.userProjects.filter((x) => x.projectId === String(projectId));
  return links
    .map((link) => {
      const u = db.users.find((x) => x.user_id === link.userId);
      if (!u) return null;
      return {
        user_id: u.user_id,
        email: u.email,
        username: u.username,
        imagePath: u.imagePath || null,
        walletAddress: u.walletAddress || "",
      };
    })
    .filter(Boolean);
}

function ensureDefaultStoryForProject(db, projectId) {
  ensureScrumSchema(db);
  const pid = String(projectId);
  let sprint = db.sprints.find((x) => String(x.project_id) === pid && x.isDefault);
  if (!sprint) {
    sprint = {
      sprint_id: nextNumericId(db.sprints, "sprint_id"),
      project_id: pid,
      sprintName: "Backlog Sprint",
      sprintGoal: "Default sprint for migrated tasks",
      isDefault: true,
      timeStart: new Date().toISOString(),
      timeEnd: new Date().toISOString(),
    };
    db.sprints.push(sprint);
  }

  let story = db.stories.find((x) => String(x.project_id) === pid && x.isDefault);
  if (!story) {
    story = {
      story_id: nextNumericId(db.stories, "story_id"),
      project_id: pid,
      sprint_id: sprint.sprint_id,
      epic_id: null,
      storyName: "General Story",
      description: "Default story for migrated tasks",
      storyStatus: "TODO",
      isDefault: true,
    };
    db.stories.push(story);
  }

  return { sprint, story };
}

function createOwnerNotification(db, projectId, actorUserId, type, message) {
  ensureScrumSchema(db);
  const ownerLink = db.userProjects.find(
    (x) => String(x.projectId) === String(projectId) && Number(x.roleId) === 3
  );
  if (!ownerLink) return;
  const ownerUserId = Number(ownerLink.userId);
  if (ownerUserId === Number(actorUserId)) return;
  db.notifications.push({
    notification_id: nextNumericId(db.notifications, "notification_id"),
    projectId: String(projectId),
    ownerUserId,
    actorUserId: Number(actorUserId || 0),
    type,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

module.exports = {
  getUserRoleInProject,
  isOwner,
  roleName,
  findUsersByProject,
  ensureDefaultStoryForProject,
  createOwnerNotification,
};
