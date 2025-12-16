package com.workschedule.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.Collection;
import java.util.Date;
import java.util.List;
@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "users"
)
public class Users implements UserDetails {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    @Column(
            name = "user_id"
    )
    private long user_id;
   
    private String email;
    private String password;
    private String userName;
    private String imagePath;
    private String description;
    @Column(name = "wallet_address")
    private String walletAddress;
    @OneToMany(
            mappedBy = "users"
    )
    @JsonIgnore
    private List<User_Task> userTaskList;

//    @OneToMany(
//            mappedBy = "users"
//    )
//    private List<User_Role> userRoleList;

    @OneToMany(
            mappedBy = "users"
    )
    @JsonIgnore
    private List<Comment> commentList;

    @OneToMany(
            mappedBy = "users"
    )
    @JsonIgnore
    private List<UserNote> userNotes;

    @OneToMany(
            mappedBy = "users"
    )
    @JsonIgnore
    private List<User_Project> userProjectList;


    public Collection<? extends GrantedAuthority> getAuthorities() {
        return null;
    }

    public String getUsername() {
        return this.userName;
    }

    public String getPassword() {
        return this.password;
    }

    public boolean isAccountNonExpired() {
        return true;
    }

    public boolean isAccountNonLocked() {
        return true;
    }

    public boolean isCredentialsNonExpired() {
        return true;
    }

    public boolean isEnabled() {
        return true;
    }
}
