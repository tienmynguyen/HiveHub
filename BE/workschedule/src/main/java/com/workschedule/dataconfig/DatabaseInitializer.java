package com.workschedule.dataconfig;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        // Execute your SQL code here
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS role (\n" +
                "    role_id BIGINT AUTO_INCREMENT PRIMARY KEY,\n" +
                "    roleName VARCHAR(255) NOT NULL,\n" +
                "    description VARCHAR(255))");

        jdbcTemplate.execute("INSERT INTO role (role_id, roleName, description)\n" +
                "SELECT NULL, 'Member', 'NULL'\n" +
                "FROM DUAL\n" +
                "WHERE NOT EXISTS (\n" +
                "    SELECT 1\n" +
                "    FROM role\n" +
                "    WHERE roleName = 'Member'\n" +
                ");");

        jdbcTemplate.execute("INSERT INTO role (role_id, roleName, description)\n" +
                "SELECT NULL, 'Leader', 'NULL'\n" +
                "FROM DUAL\n" +
                "WHERE NOT EXISTS (\n" +
                "    SELECT 1\n" +
                "    FROM role\n" +
                "    WHERE roleName = 'Leader'\n" +
                ");");

        jdbcTemplate.execute("INSERT INTO role (role_id, roleName, description)\n" +
                "SELECT NULL, 'Owner', 'NULL'\n" +
                "FROM DUAL\n" +
                "WHERE NOT EXISTS (\n" +
                "    SELECT 1\n" +
                "    FROM role\n" +
                "    WHERE roleName = 'Owner'\n" +
                ");");
    }
}
