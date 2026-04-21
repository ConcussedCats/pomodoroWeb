package com.example.telos.repository;


import com.example.telos.model.ErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogErrorRepository extends JpaRepository<ErrorLog, Long> {
    java.util.List<ErrorLog> findAllByOrderByOccurredAtDesc();
}
