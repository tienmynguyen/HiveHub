import Config from './config.json';

const BASE_URL = Config.URLAPI;

export const endpoints = {
    auth: {
        login: () => `${BASE_URL}/login`,
        register: () => `${BASE_URL}/register`,
    },
    user: {
        update: (userId) => `${BASE_URL}/updateuser?userId=${userId}`,
        getBalance: (walletAddress) => `${BASE_URL}/getbalance?walletAddress=${walletAddress}`,
    },
    notes: {
        getAllByUser: (userId) => `${BASE_URL}/getallnotebyuser?userId=${userId}`,
        create: (userId) => `${BASE_URL}/addnote?userId=${userId}`,
        remove: (noteId) => `${BASE_URL}/deletenote?noteId=${noteId}`,
    },
    projects: {
        getByUser: (userId) => `${BASE_URL}/getprjectbyuserId?userId=${userId}`,
        create: (userId) => `${BASE_URL}/createdproject?userId=${userId}`,
        join: (userId, projectId) => `${BASE_URL}/joinproject?userId=${userId}&projectId=${projectId}`,
        updateUserRole: (projectId, userId, roleId) =>
            `${BASE_URL}/updateuserproject?projectId=${projectId}&userId=${userId}&roleId=${roleId}`,
        getUsers: (projectId) => `${BASE_URL}/getalluserbyprojectId?projectId=${projectId}`,
        getTasks: (projectId) => `${BASE_URL}/gettaskbyprojectid?projectid=${projectId}`,
        getRole: (projectId, userId) => `${BASE_URL}/findroleinuspr?projectId=${projectId}&userId=${userId}`,
    },
    tasks: {
        getByUser: (userId) => `${BASE_URL}/getalltaskbyuser?userId=${userId}`,
        getByDate: (userId, date) => `${BASE_URL}/findtaskbydate?user_id=${userId}&date=${date}`,
        create: (projectId) => `${BASE_URL}/addtask?projectId=${projectId}`,
        addUser: (taskId, userId) => `${BASE_URL}/addusertask?taskId=${taskId}&userId=${userId}`,
        getUsers: (taskId) => `${BASE_URL}/getalluserbytaskId?taskId=${taskId}`,
        update: (taskId) => `${BASE_URL}/updatetask?taskId=${taskId}`,
        approve: () => `${BASE_URL}/approvetask`,
        reject: (taskId, adminId, reason) =>
            `${BASE_URL}/rejecttask?taskId=${taskId}&adminId=${adminId}&reason=${encodeURIComponent(reason)}`,
        postComment: (taskId, userId) => `${BASE_URL}/postcomment?taskId=${taskId}&userId=${userId}`,
        getComments: (taskId) => `${BASE_URL}/getallcommentbyTask?taskId=${taskId}`,
    },
    chat: {
        socket: () => `${BASE_URL}/ws`,
        getMessages: (projectId) => `${BASE_URL}/chat/getallmessage?projectId=${projectId}`,
        addMessage: () => `${BASE_URL}/chat/addmessage`,
    },
    wallet: {
        transferToken: () => `${BASE_URL}/transfertoken`,
    },
};

