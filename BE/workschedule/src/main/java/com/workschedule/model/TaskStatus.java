package com.workschedule.model;

public enum TaskStatus {
    TODO,
    DOING,       // Có thể bạn đang dùng DOING thay vì IN_PROGRESS?
    IN_PROGRESS, // --- THÊM DÒNG NÀY ---
    DONE,
    COMPLETED,
    PENDING_APPROVAL // Trạng thái chờ duyệt (nếu cần cho blockchain)
}