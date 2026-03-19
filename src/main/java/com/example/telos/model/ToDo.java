package com.example.telos.model;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@ToString
@NoArgsConstructor
@Entity
@Table(name = "todos")
public class ToDo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "todo_id", nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name="user_id", nullable = false)
    @Setter
    @ToString.Exclude
    private User user;

    @Setter
    @Column(name = "todo_title", nullable = false)
    private String title;

    @Setter
    @Column(name = "todo_description")
    private String description;

    @Setter
    @Column(name = "is_done", nullable = false)
    private Boolean isDone;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(name = "todo_priority", nullable = false)
    private Priority priority;

    @Setter
    @Column(name = "todo_deadline")
    private LocalDateTime deadline;

    @Setter
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (isDone == null) isDone = true;
        if (priority == null) priority = Priority.LOW;
    }
}
