package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Users;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements UsersService {

    @Autowired
    private UsersRepository usersRepository;

    @Override
    public List<Users> findAll() {
        return usersRepository.findAll();
    }

    @Override
    public Users findById(Long id) {
        return usersRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cannot find user with id:" + id));
    }

    @Override
    public void deteleById(Long id) {
        usersRepository.deleteById(id);
    }

    @Override
    public Users save(UserDto userDto) {
        List<Users> usersList = usersRepository.findAll();

        for (Users user : usersList) {
            if (user.getEmail().equals(userDto.getEmaildto())) {
                throw new ResourceNotFoundException("Email already exists.");
            }
        }

        if (userDto.getUserName().equals(userDto.getEmaildto())) {
            throw new ResourceNotFoundException("Username and email must not be the same.");
        }

        Users users = new Users();
        users.setEmail(userDto.getEmaildto());
        users.setPassword(userDto.getPassworddto());
        users.setUserName(userDto.getUserName());
        // Nếu muốn lưu ví ngay lúc tạo user mới thì thêm dòng này:
        // if(userDto.getWalletAddress() != null) users.setWalletAddress(userDto.getWalletAddress());
        
        return usersRepository.save(users);
    }

    @Override
    public Users update(UserDto userDto, Long userId) {
        // 1. Tìm User cũ
        Users users = findById(userId);

        // 2. Validate Email (Nếu có thay đổi)
        if (userDto.getEmaildto() != null && !userDto.getEmaildto().equals(users.getEmail())) {
            List<Users> usersList = usersRepository.findAll();
            for (Users user : usersList) {
                if (user.getEmail().equals(userDto.getEmaildto())) {
                    throw new ResourceNotFoundException("Email already exists.");
                }
            }
            users.setEmail(userDto.getEmaildto());
        }

        // 3. Validate Username
        String currentEmail = (userDto.getEmaildto() != null) ? userDto.getEmaildto() : users.getEmail();
        if (userDto.getUserName() != null) {
            if (userDto.getUserName().equals(currentEmail)) {
                throw new ResourceNotFoundException("Username and email must not be the same.");
            }
            users.setUserName(userDto.getUserName());
        }

        // 4. Cập nhật các trường thông tin khác
        if (userDto.getImagePath() != null) {
            users.setImagePath(userDto.getImagePath());
        }
        if (userDto.getPassworddto() != null) {
            users.setPassword(userDto.getPassworddto());
        }
        if (userDto.getDescription() != null) {
            users.setDescription(userDto.getDescription());
        }

        // --- 5. CẬP NHẬT VÍ (QUAN TRỌNG: PHẢI SET TRƯỚC KHI SAVE) ---
        if (userDto.getWalletAddress() != null && !userDto.getWalletAddress().isEmpty()) {
            users.setWalletAddress(userDto.getWalletAddress());
        }

        // 6. Lưu xuống Database
        Users usersave = usersRepository.save(users);

        // 7. Dọn dẹp dữ liệu trả về (tránh vòng lặp vô tận JSON)
        usersave.setUserProjectList(null);
        usersave.setUserNotes(null);
        usersave.setCommentList(null);
        usersave.setUserTaskList(null);

        return usersave;
    }

    @Override
    public Users logintest(UserDto userDto) throws NotFoundException {
        List<Users> usersList = findAll();

        for (Users user : usersList) {
            if (user.getEmail().equals(userDto.getEmaildto())
                    && user.getPassword().equals(userDto.getPassworddto())) {
                
                user.setUserProjectList(null);
                user.setUserNotes(null);
                user.setCommentList(null);
                user.setUserTaskList(null);
                return user;
            }
        }
        throw new ResourceNotFoundException("User with email " + userDto.getEmaildto() + " not found!!!");
    }

    @Override
    public UserDto login(UserDto userDto) throws NotFoundException {
        List<Users> usersList = findAll();

        for (Users user : usersList) {
            if (user.getEmail().equals(userDto.getEmaildto())
                    && user.getPassword().equals(userDto.getPassworddto())) {

                return UserDto.builder()
                        .emaildto(user.getEmail())
                        .userName(user.getUsername())
                        .passworddto("************")
                        .imagePath(user.getImagePath())
                        // Có thể trả về ví ở đây nếu cần hiển thị ngay sau khi login
                        .walletAddress(user.getWalletAddress()) 
                        .build();
            }
        }
        throw new ResourceNotFoundException("User with email " + userDto.getEmaildto() + " not found!!!");
    }
}