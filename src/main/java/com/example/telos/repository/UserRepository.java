package com.example.telos.repository;

import com.example.telos.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    @Query(value = """
    SELECT u
    FROM User u
    WHERE u.email = :login
    or u.username = :login
""")
    Optional<User> findByEmailOrUsername(@Param("login") String login);
}
