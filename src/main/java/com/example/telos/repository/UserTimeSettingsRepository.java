package com.example.telos.repository;

import com.example.telos.model.User;
import com.example.telos.model.UserTimeSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserTimeSettingsRepository extends JpaRepository<UserTimeSettings, Long> {
    Optional<UserTimeSettings> findByUser(User user);
}
