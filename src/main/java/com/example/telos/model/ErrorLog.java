package com.example.telos.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "error_logs")
public class ErrorLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "error_id", unique = true, nullable = false)
    private Long error_id;

    @Column(name = "http_error", nullable = false)
    private Integer httpError;

    @Column(name = "error_description", nullable = false)
    private String errorDescription;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    public void prePersist() {
        this.occurredAt = LocalDateTime.now();
    }
}
