package com.example.telos.service;

import com.example.telos.dto.ToDoDto;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.model.Priority;
import com.example.telos.model.ToDo;
import com.example.telos.model.User;
import com.example.telos.repository.ToDoRepository;
import com.example.telos.service.impl.ToDoServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ToDoServiceImplTest {

    @Mock
    private UserService userService;

    @Mock
    private ToDoRepository toDoRepository;

    @InjectMocks
    private ToDoServiceImpl toDoService;

    @Test
    void shouldCreateTodoAndPersistDeadlineFields() {
        User user = buildUser(1L, "user@test.com");
        ToDoDto dto = new ToDoDto();
        dto.setTitle("Ship regression pass");
        dto.setDescription("Verify deadline handling");
        dto.setIsDone(false);
        dto.setPriority(Priority.HIGH);
        dto.setDeadline(LocalDateTime.of(2099, 4, 10, 12, 30));

        ToDo savedToDo = new ToDo();
        ReflectionTestUtils.setField(savedToDo, "todoId", 15L);
        ReflectionTestUtils.setField(savedToDo, "user", user);
        savedToDo.setTitle(dto.getTitle());
        savedToDo.setDescription(dto.getDescription());
        savedToDo.setIsDone(dto.getIsDone());
        savedToDo.setPriority(dto.getPriority());
        savedToDo.setDeadline(dto.getDeadline());
        savedToDo.setCreatedAt(LocalDateTime.of(2099, 4, 8, 9, 0));

        when(userService.findByEmailOrUsername("user@test.com")).thenReturn(user);
        when(toDoRepository.save(org.mockito.ArgumentMatchers.any(ToDo.class))).thenReturn(savedToDo);

        ToDoResponseDto response = toDoService.createNewToDo("user@test.com", dto);

        ArgumentCaptor<ToDo> captor = ArgumentCaptor.forClass(ToDo.class);
        verify(toDoRepository).save(captor.capture());
        ToDo persisted = captor.getValue();

        assertEquals("Ship regression pass", persisted.getTitle());
        assertEquals("Verify deadline handling", persisted.getDescription());
        assertEquals(Priority.HIGH, persisted.getPriority());
        assertEquals(LocalDateTime.of(2099, 4, 10, 12, 30), persisted.getDeadline());
        assertEquals(15L, response.getTodoId());
        assertEquals(LocalDateTime.of(2099, 4, 10, 12, 30), response.getDeadline());
        assertEquals("Task was created successfully", response.getMessage());
    }

    @Test
    void shouldRejectUpdateForTodoOwnedByAnotherUser() {
        User currentUser = buildUser(1L, "user@test.com");
        User anotherUser = buildUser(2L, "other@test.com");
        ToDo existingToDo = new ToDo();
        ReflectionTestUtils.setField(existingToDo, "todoId", 91L);
        ReflectionTestUtils.setField(existingToDo, "user", anotherUser);
        existingToDo.setTitle("Foreign task");
        existingToDo.setPriority(Priority.LOW);

        ToDoDto dto = new ToDoDto();
        dto.setTitle("Updated title");
        dto.setDescription("Updated description");
        dto.setIsDone(true);
        dto.setPriority(Priority.MEDIUM);
        dto.setDeadline(LocalDateTime.of(2099, 4, 11, 11, 0));

        when(userService.findByEmailOrUsername("user@test.com")).thenReturn(currentUser);
        when(toDoRepository.findById(91L)).thenReturn(Optional.of(existingToDo));

        EntityNotFoundException exception = assertThrows(
                EntityNotFoundException.class,
                () -> toDoService.updateToDo("user@test.com", 91L, dto)
        );

        assertEquals("ToDo not found with id: 91", exception.getMessage());
    }

    private User buildUser(Long id, String email) {
        User user = new User();
        ReflectionTestUtils.setField(user, "userId", id);
        user.setEmail(email);
        user.setUsername("demo-user");
        return user;
    }
}
