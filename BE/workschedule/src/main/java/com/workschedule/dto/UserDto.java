package com.workschedule.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDto {

    @Email(message = "Email không hợp lệ")
    String emaildto;

    @Size(min = 8, message = "Password phải từ 8 kí tự trở lên")
    String passworddto;

    String userName;
    String imagePath;
    private String description;
    private String walletAddress;
}
