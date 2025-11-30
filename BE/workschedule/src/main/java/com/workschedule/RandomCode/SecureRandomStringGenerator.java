package com.workschedule.RandomCode;

import java.security.SecureRandom;

public class SecureRandomStringGenerator {
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    public static String generateSecureRandomString(int length) {
        SecureRandom secureRandom = new SecureRandom();
        StringBuilder stringBuilder = new StringBuilder(length);

        for (int i = 0; i < length; i++) {
            int randomIndex = secureRandom.nextInt(CHARACTERS.length());
            stringBuilder.append(CHARACTERS.charAt(randomIndex));
        }

        return stringBuilder.toString();
    }


    public static void main(String[] args) {
        int length = 10; // Độ dài của chuỗi ngẫu nhiên
        String randomString = generateSecureRandomString(length);
        System.out.println("Chuỗi ngẫu nhiên bảo mật: " + randomString);
    }
}