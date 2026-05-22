import Config from './config.json';

const BASE_URL = Config.URLAPI;

export const endpoints = {
    auth: {
        login: () => `${BASE_URL}/auth/login`,
        register: () => `${BASE_URL}/auth/register`,
        refresh: () => `${BASE_URL}/auth/refresh`,
        logout: () => `${BASE_URL}/auth/logout`,
    },
    user: {
        update: (userId) => `${BASE_URL}/updateuser?userId=${userId}`,
    },
    notes: {
        getAllByUser: (userId) => `${BASE_URL}/getallnotebyuser?userId=${userId}`,
        create: (userId) => `${BASE_URL}/addnote?userId=${userId}`,
        remove: (noteId) => `${BASE_URL}/deletenote?noteId=${noteId}`,
    },
    projects: {
        getByUser: (userId) => `${BASE_URL}/getprjectbyuserId?userId=${userId}`,
        getById: (projectId, userId) =>
            `${BASE_URL}/getprojectbyid?projectId=${encodeURIComponent(projectId)}&userId=${userId}`,
        create: (userId) => `${BASE_URL}/createdproject?userId=${userId}`,
        join: (userId, projectId) => `${BASE_URL}/joinproject?userId=${userId}&projectId=${projectId}`,
        updateUserRole: (projectId, targetUserId, roleId, actorId) =>
            `${BASE_URL}/updateuserproject?projectId=${encodeURIComponent(projectId)}&userId=${targetUserId}&roleId=${roleId}&actorId=${actorId}`,
        removeMember: (projectId, targetUserId, actorId) =>
            `${BASE_URL}/removememberfromproject?projectId=${encodeURIComponent(projectId)}&targetUserId=${targetUserId}&actorId=${actorId}`,
        deleteProject: (projectId, actorId) =>
            `${BASE_URL}/deleteproject?projectId=${encodeURIComponent(projectId)}&actorId=${actorId}`,
        getUsers: (projectId) => `${BASE_URL}/getalluserbyprojectId?projectId=${projectId}`,
        getTasks: (projectId) => `${BASE_URL}/gettaskbyprojectid?projectid=${projectId}`,
        getRole: (projectId, userId) => `${BASE_URL}/findroleinuspr?projectId=${projectId}&userId=${userId}`,
        getSprints: (projectId) => `${BASE_URL}/getsprintbyprojectid?projectId=${projectId}`,
        createSprint: (projectId) => `${BASE_URL}/addsprint?projectId=${projectId}`,
        updateSprint: (sprintId, userId) => `${BASE_URL}/updatesprint?sprintId=${sprintId}&userId=${userId}`,
        deleteSprint: (sprintId, userId) => `${BASE_URL}/deletesprint?sprintId=${sprintId}&userId=${userId}`,
        getEpics: (projectId) => `${BASE_URL}/getepicbyprojectid?projectId=${projectId}`,
        createEpic: (projectId) => `${BASE_URL}/addepic?projectId=${projectId}`,
        getStories: (projectId, sprintId, epicId) => {
            const params = new URLSearchParams({ projectId: String(projectId) });
            if (sprintId) params.append('sprintId', String(sprintId));
            if (epicId) params.append('epicId', String(epicId));
            return `${BASE_URL}/getstorybyprojectid?${params.toString()}`;
        },
        createStory: (projectId, sprintId, epicId) => {
            const params = new URLSearchParams({ projectId: String(projectId) });
            if (sprintId != null && sprintId !== '') params.append('sprintId', String(sprintId));
            if (epicId != null && epicId !== '') params.append('epicId', String(epicId));
            return `${BASE_URL}/addstory?${params.toString()}`;
        },
        addMemberByEmail: (projectId, ownerId) =>
            `${BASE_URL}/addmemberbyemail?projectId=${projectId}&ownerId=${ownerId}`,
    },
    tasks: {
        getByUser: (userId) => `${BASE_URL}/getalltaskbyuser?userId=${userId}`,
        getByDate: (userId, date) => `${BASE_URL}/findtaskbydate?user_id=${userId}&date=${date}`,
        create: (projectId) => `${BASE_URL}/addtask?projectId=${projectId}`,
        addUser: (taskId, userId, actorId) => `${BASE_URL}/addusertask?taskId=${taskId}&userId=${userId}&actorId=${actorId}`,
        removeUser: (taskId, userId, actorId) => `${BASE_URL}/removeusertask?taskId=${taskId}&userId=${userId}&actorId=${actorId}`,
        getUsers: (taskId) => `${BASE_URL}/getalluserbytaskId?taskId=${taskId}`,
        update: (taskId, userId) => `${BASE_URL}/updatetask?taskId=${taskId}&userId=${userId}`,
        approve: () => `${BASE_URL}/approvetask`,
        getApproval: (taskId) => `${BASE_URL}/task-approval/${taskId}`,
        reject: (taskId, adminId, reason) =>
            `${BASE_URL}/rejecttask?taskId=${taskId}&adminId=${adminId}&reason=${encodeURIComponent(reason)}`,
        postComment: (taskId, userId) => `${BASE_URL}/postcomment?taskId=${taskId}&userId=${userId}`,
        getComments: (taskId) => `${BASE_URL}/getallcommentbyTask?taskId=${taskId}`,
        getByStory: (storyId) => `${BASE_URL}/getsubtaskbystoryid?storyId=${storyId}`,
    },
    stories: {
        getById: (storyId) => `${BASE_URL}/getstorybyid?storyId=${storyId}`,
        update: (storyId, userId) => `${BASE_URL}/updatestory?storyId=${storyId}&userId=${userId}`,
        getComments: (storyId) => `${BASE_URL}/getallcommentbystory?storyId=${storyId}`,
        postComment: (storyId, userId) => `${BASE_URL}/poststorycomment?storyId=${storyId}&userId=${userId}`,
    },
    notifications: {
        getForOwner: (projectId, userId) => `${BASE_URL}/notifications?projectId=${projectId}&userId=${userId}`,
        markRead: (notificationId, userId) => `${BASE_URL}/notifications/read?notificationId=${notificationId}&userId=${userId}`,
    },
    chat: {
        socket: () => `${BASE_URL}/ws`,
        getMessages: (projectId) => `${BASE_URL}/chat/getallmessage?projectId=${projectId}`,
        addMessage: () => `${BASE_URL}/chat/addmessage`,
    },
    agent: {
        chat: () => `${BASE_URL}/agent/chat`,
        plan: () => `${BASE_URL}/agent/plan`,
        report: () => `${BASE_URL}/agent/report`,
        preview: () => `${BASE_URL}/agent/commands/preview`,
        execute: () => `${BASE_URL}/agent/commands/execute`,
        clearMemory: () => `${BASE_URL}/agent/clear-memory`,
    },
};

