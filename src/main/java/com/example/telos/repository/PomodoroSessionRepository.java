package com.example.telos.repository;

import com.example.telos.model.history.PomodoroSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, Long> {
    Optional<PomodoroSession> findByUserIdAndExternalId(Long userId, UUID externalId);

    Page<PomodoroSession> findByUserIdOrderByStartedAtDesc(Long userId, Pageable pageable);

    List<PomodoroSession> findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThan(
            Long userId, Instant from, Instant to);
}
