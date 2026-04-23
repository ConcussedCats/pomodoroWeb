package com.example.telos.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "notes")
public class Note {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "note_id", nullable = false)
    private Long noteId;


    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @Setter
    @ToString.Exclude
    private User user;

    @Setter
    @Column(name = "note_text",  nullable = false)
    private String noteText;

    @Setter
    @Column(name = "created_at", nullable = false,  updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
