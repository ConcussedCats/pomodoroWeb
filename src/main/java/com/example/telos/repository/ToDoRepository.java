package com.example.telos.repository;

import com.example.telos.model.ToDo;
import com.example.telos.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToDoRepository extends JpaRepository<ToDo, Long> {
    List<ToDo> findAllByUser(User user);
}
