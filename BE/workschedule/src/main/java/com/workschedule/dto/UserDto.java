package com.workschedule.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDto {

    @Email(message = "Email không hợp lệ")
String emaildto;
    @NotEmpty(message = "Thiếu password")
    @Min(value = 8, message = "Password phải từ 8 kí tự trở lên")
String passworddto;
    @Min(value = 1, message = "userName không được để trống")
    String userName;
    String imagePath;
    private String description;
    private String walletAddress;
}
