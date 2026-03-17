package com.example.telos.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@ToString
@NoArgsConstructor
@Entity
@Table(name="users")
public class User {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Setter
    @Column(name = "username", unique = true, nullable = false)
    private String username;

    @Setter
    @Column(name="email", unique = true, nullable = false)
    private String email;

    @Setter
    @Column(name="password", nullable = false)
    private String password;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    @ToString.Exclude
    @OneToOne(mappedBy = "user")
    private UserTimeSettings userTimeSettings;
}
