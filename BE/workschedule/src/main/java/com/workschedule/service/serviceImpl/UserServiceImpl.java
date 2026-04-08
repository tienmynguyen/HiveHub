package com.workschedule.service.serviceImpl;

import com.workschedule.Exception.NotFoundException;
import com.workschedule.Exception.ResourceNotFoundException;
import com.workschedule.dto.UserDto;
import com.workschedule.model.Users;
import com.workschedule.repository.UsersRepository;
import com.workschedule.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Locale;

@Service
public class UserServiceImpl implements UsersService {

    @Autowired
    private UsersRepository usersRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String BCRYPT_PREFIX = "$2";
    private static final String SHA_256_REGEX = "^[a-fA-F0-9]{64}$";

    private boolean isBcryptHash(String value) {
        return value != null && value.startsWith(BCRYPT_PREFIX);
    }

    private String sha256Hex(String rawValue) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawValue.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }

    private String normalizeIncomingPassword(String incomingPassword) {
        if (incomingPassword == null || incomingPassword.isBlank()) {
            return incomingPassword;
        }
        if (incomingPassword.matches(SHA_256_REGEX)) {
            return incomingPassword.toLowerCase(Locale.ROOT);
        }
        // Allow old clients that still send raw password.
        return sha256Hex(incomingPassword);
    }

    private String encodeIncomingPassword(String incomingPassword) {
        String normalizedPassword = normalizeIncomingPassword(incomingPassword);
        if (normalizedPassword == null || normalizedPassword.isBlank()) {
            throw new ResourceNotFoundException("Thiếu password");
        }
        return passwordEncoder.encode(normalizedPassword);
    }

    private boolean matchesIncomingPassword(String incomingPassword, String storedPassword) {
        if (incomingPassword == null || storedPassword == null) {
            return false;
        }
        String normalizedPassword = normalizeIncomingPassword(incomingPassword);
        if (isBcryptHash(storedPassword)) {
            // Main flow: FE sends SHA-256 password, BE stores BCrypt(SHA-256).
            if (passwordEncoder.matches(normalizedPassword, storedPassword)) {
                return true;
            }
            // Backward compatibility: old records may be BCrypt(raw password).
            return passwordEncoder.matches(incomingPassword, storedPassword);
        }
        // Backward compatibility for legacy plain-text passwords.
        return storedPassword.equals(incomingPassword) || storedPassword.equals(normalizedPassword);
    }

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
        if (userDto.getEmaildto() == null || userDto.getEmaildto().isBlank()) {
            throw new ResourceNotFoundException("Thiếu email");
        }
        if (userDto.getUserName() == null || userDto.getUserName().isBlank()) {
            throw new ResourceNotFoundException("userName không được để trống");
        }
        List<Users> usersList = usersRepository.findAll();

        for (Users user : usersList) {
            if (user.getEmail().equals(userDto.getEmaildto())) {
                throw new ResourceNotFoundException("Email already exists.");
            }
        }

        if (userDto.getUserName() != null && userDto.getUserName().equals(userDto.getEmaildto())) {
            throw new ResourceNotFoundException("Username and email must not be the same.");
        }

        Users users = new Users();
        users.setEmail(userDto.getEmaildto());
        users.setPassword(encodeIncomingPassword(userDto.getPassworddto()));
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
        if (userDto.getPassworddto() != null && !userDto.getPassworddto().isBlank()) {
            users.setPassword(encodeIncomingPassword(userDto.getPassworddto()));
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
                    && matchesIncomingPassword(userDto.getPassworddto(), user.getPassword())) {

                if (!isBcryptHash(user.getPassword())) {
                    user.setPassword(encodeIncomingPassword(userDto.getPassworddto()));
                    usersRepository.save(user);
                }
                
                user.setPassword("********");
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
                    && matchesIncomingPassword(userDto.getPassworddto(), user.getPassword())) {

                if (!isBcryptHash(user.getPassword())) {
                    user.setPassword(encodeIncomingPassword(userDto.getPassworddto()));
                    usersRepository.save(user);
                }

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