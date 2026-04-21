package com.example.telos.service;

import com.example.telos.dto.ToDoDto;
import com.example.telos.dto.ToDoCompletionDto;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.model.ToDo;
import com.example.telos.model.User;

import java.util.List;

public interface ToDoService {
    ToDo findById(long id);
    ToDo create(ToDo toDo);
    ToDo update(ToDo toDo);
    List<ToDo> findAllByUser(User user);

    List<ToDoResponseDto> getUserToDos(String login);
    ToDoResponseDto createNewToDo(String login, ToDoDto toDoDto);
    ToDoResponseDto updateToDo(String login, long todoId, ToDoDto toDoDto);
    ToDoResponseDto updateCompletion(String login, long todoId, ToDoCompletionDto toDoCompletionDto);
    void deleteToDo(String login, long id);

    void delete(ToDo toDo);
}

