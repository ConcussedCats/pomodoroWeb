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
    @Column(name = "user_id", nullable = false)
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

    @Column(name="created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin;

    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.isAdmin = false; // we will add admins manually in db
    }

    @ToString.Exclude
    @OneToOne(mappedBy = "user")
    private UserTimeSettings userTimeSettings;

    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (object == null || getClass() != object.getClass()) {
            return false;
        }
        User user = (User) object;
        return Objects.equals(userId, user.userId);
    }
}
