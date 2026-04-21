package com.example.telos.service.impl;

import com.example.telos.dto.ToDoDto;
import com.example.telos.dto.ToDoCompletionDto;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.model.ToDo;
import com.example.telos.model.User;
import com.example.telos.repository.ToDoRepository;
import com.example.telos.service.ToDoService;
import com.example.telos.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@AllArgsConstructor
public class ToDoServiceImpl implements ToDoService {
    private final UserService userService;
    private final ToDoRepository toDoRepository;

    @Override
    public ToDo findById(long id) {
        return toDoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ToDo not found with id: " + id));
    }

    @Override
    public ToDo create(ToDo toDo) {
        return toDoRepository.save(toDo);
    }

    @Override
    public ToDo update(ToDo toDo) {
        return toDoRepository.save(toDo);
    }

    @Override
    public List<ToDo> findAllByUser(User user) {
        return toDoRepository.findAllByUser(user);
    }

    @Override
    public List<ToDoResponseDto> getUserToDos(String login) {
        User user = userService.findByEmailOrUsername(login);

        return findAllByUser(user).stream()
                .map(toDo -> mapToResponse(toDo, null))
                .toList();
    }

    @Override
    public ToDoResponseDto createNewToDo(String login, ToDoDto toDoDto) {
        User user = userService.findByEmailOrUsername(login);

        ToDo toDo = new ToDo();
        toDo.setUser(user);
        applyDto(toDo, toDoDto);

        ToDo createdToDo = create(toDo);
        return mapToResponse(createdToDo, "Task was created successfully");
    }

    @Override
    public ToDoResponseDto updateToDo(String login, long todoId, ToDoDto toDoDto) {
        User user = userService.findByEmailOrUsername(login);
        ToDo toDo = findById(todoId);

        if (!toDo.getUser().getUserId().equals(user.getUserId())) {
            throw new EntityNotFoundException("ToDo not found with id: " + todoId);
        }

        applyDto(toDo, toDoDto);

        ToDo updatedToDo = update(toDo);
        return mapToResponse(updatedToDo, "Task was updated successfully");
    }

    @Override
    public ToDoResponseDto updateCompletion(String login, long todoId, ToDoCompletionDto toDoCompletionDto) {
        User user = userService.findByEmailOrUsername(login);
        ToDo toDo = findById(todoId);

        if (!toDo.getUser().getUserId().equals(user.getUserId())) {
            throw new EntityNotFoundException("ToDo not found with id: " + todoId);
        }

        toDo.setIsDone(toDoCompletionDto.getIsDone());

        ToDo updatedToDo = update(toDo);
        return mapToResponse(updatedToDo, "Task completion was updated successfully");
    }

    @Override
    public void deleteToDo(String login, long id) {
        User user = userService.findByEmailOrUsername(login);
        ToDo toDo = findById(id);

        if (!toDo.getUser().getUserId().equals(user.getUserId())) {
            throw new EntityNotFoundException("ToDo not found with id: " + id);
        }

        delete(toDo);
    }

    @Override
    public void delete(ToDo toDo) {
        toDoRepository.delete(toDo);
    }

    private void applyDto(ToDo toDo, ToDoDto toDoDto) {
        if (toDoDto.getDeadline() != null && toDoDto.getDeadline().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Deadline cannot be in the past");
        }

        String title = toDoDto.getTitle().trim();
        String description = toDoDto.getDescription() == null ? null : toDoDto.getDescription().trim();

        toDo.setTitle(title);
        toDo.setDescription(description == null || description.isBlank() ? null : description);
        toDo.setIsDone(toDoDto.getIsDone());
        toDo.setPriority(toDoDto.getPriority());
        toDo.setDeadline(toDoDto.getDeadline());
    }

    private ToDoResponseDto mapToResponse(ToDo toDo, String message) {
        ToDoResponseDto responseDto = new ToDoResponseDto();
        responseDto.setTodoId(toDo.getTodoId());
        responseDto.setTitle(toDo.getTitle());
        responseDto.setDescription(toDo.getDescription());
        responseDto.setIsDone(toDo.getIsDone());
        responseDto.setPriority(toDo.getPriority());
        responseDto.setDeadline(toDo.getDeadline());
        responseDto.setCreatedAt(toDo.getCreatedAt());
        responseDto.setMessage(message);
        return responseDto;
    }
}
