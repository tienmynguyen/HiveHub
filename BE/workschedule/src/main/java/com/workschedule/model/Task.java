package com.workschedule.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;
import java.util.List;

@Entity
@Setter // Lombok tự tạo hàm set...
@Getter // Lombok tự tạo hàm get... -> JSON sẽ có trường tương ứng
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "task")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private long task_id;

    private String taskName;
    private String description;
    private Date timeStart;
    private Date timeEnd;
    private Date deadline;
    private String taskStatus;

    // --- CÁC MỐI QUAN HỆ (RELATIONSHIPS) ---

    @OneToMany(mappedBy = "task")
    
    private List<User_Task> userTaskList;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id", referencedColumnName = "project_id")
    private Project project;

    @OneToMany(mappedBy = "task")
    @JsonIgnore
    private List<Comment> commentList;

    // --- CÁC TRƯỜNG BLOCKCHAIN (QUAN TRỌNG) ---

    // 1. Mã giao dịch (TxHash)
    // Lưu ý: Tên biến là 'txHash' thì JSON trả về sẽ là "txHash"
    // Cột trong DB là 'tx_hash' (Bạn nhớ chạy lệnh SQL thêm cột này chưa?)
    @Column(name = "tx_hash")
    private String txHash; 

    // 2. Trạng thái duyệt
    @Column(name = "is_approved")
    private Boolean isApproved = false; 

    // 3. Số tiền thưởng (Tùy chọn, nếu bạn muốn lưu)
    @Column(name = "reward_amount")
    private String rewardAmount;
    
    // --- LƯU Ý: Đã xóa biến 'transactionHash' cũ để tránh nhầm lẫn với 'txHash' ---
    // --- LƯU Ý: Đã xóa các hàm get/set viết tay vì Lombok (@Getter/@Setter) đã lo việc đó ---
}