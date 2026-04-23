package com.example.telos.controller.api.session;

import com.example.telos.dto.ToDoCompletionDto;
import com.example.telos.dto.ToDoDto;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.service.ToDoService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/productivity/todos")
public class ToDoRestController {
    private final ToDoService toDoService;

    @GetMapping
    public List<ToDoResponseDto> getToDos(Principal principal) {
        return toDoService.getUserToDos(principal.getName());
    }

    @PatchMapping("/{id}")
    public ToDoResponseDto updateToDo(Principal principal, @PathVariable long id, @Valid @RequestBody ToDoDto todoDto) {
        return toDoService.updateToDo(principal.getName(), id, todoDto);
    }

    @PatchMapping("/{id}/completion")
    public ToDoResponseDto updateCompletion(Principal principal, @PathVariable long id, @Valid @RequestBody ToDoCompletionDto toDoCompletionDto) {
        return toDoService.updateCompletion(principal.getName(), id, toDoCompletionDto);
    }

    @PostMapping
    public ToDoResponseDto createToDo(Principal principal, @Valid @RequestBody ToDoDto toDoDto) {
        return toDoService.createNewToDo(principal.getName(), toDoDto);
    }

    @DeleteMapping("/{id}")
    public void deleteToDo(Principal principal, @PathVariable long id) {
        toDoService.deleteToDo(principal.getName(), id);
    }
}
