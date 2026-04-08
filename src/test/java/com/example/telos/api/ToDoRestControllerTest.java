package com.example.telos.api;

import com.example.telos.controller.api.session.ToDoRestController;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.exception.RestExceptionHandler;
import com.example.telos.model.Priority;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ToDoRestController.class)
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SessionApiWebMvcTestConfig.class
})
@Tag("contract")
class ToDoRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubToDoService toDoService;

    @BeforeEach
    void setUp() {
        toDoService.reset();
    }

    @Test
    void shouldRejectAnonymousTodoListRequest() throws Exception {
        mockMvc.perform(get("/api/productivity/todos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldReturnTodosForAuthenticatedUser() throws Exception {
        ToDoResponseDto dto = new ToDoResponseDto();
        dto.setTodoId(41L);
        dto.setTitle("Review roadmap");
        dto.setDescription("Check deadline handling");
        dto.setIsDone(false);
        dto.setPriority(Priority.HIGH);
        dto.setDeadline(LocalDateTime.of(2099, 4, 8, 15, 30));
        dto.setCreatedAt(LocalDateTime.of(2099, 4, 8, 11, 0));
        toDoService.nextToDos = List.of(dto);

        mockMvc.perform(get("/api/productivity/todos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].todoId").value(41))
                .andExpect(jsonPath("$[0].title").value("Review roadmap"))
                .andExpect(jsonPath("$[0].priority").value("HIGH"))
                .andExpect(jsonPath("$[0].deadline").exists());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldCreateTodoForAuthenticatedUser() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Ship regression pass",
                                  "description": "Cover deadline negatives",
                                  "isDone": false,
                                  "priority": "MEDIUM",
                                  "deadline": "2099-04-10T12:30:00"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Task was created successfully"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectBlankTodoTitle() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "   ",
                                  "description": "desc",
                                  "isDone": false,
                                  "priority": "LOW"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("ToDo title cannot be empty"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectForbidden67TodoTitle() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "six seven",
                                  "description": "desc",
                                  "isDone": false,
                                  "priority": "LOW"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("67 and six seven are not allowed here"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectForbidden67TodoDescription() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Valid task",
                                  "description": " 67 ",
                                  "isDone": false,
                                  "priority": "LOW"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("67 and six seven are not allowed here"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectPastDeadline() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Expired task",
                                  "description": "desc",
                                  "isDone": false,
                                  "priority": "LOW",
                                  "deadline": "2000-01-01T10:00:00"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Deadline cannot be in the past"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectPastDeadlineOnTodoUpdate() throws Exception {
        mockMvc.perform(patch("/api/productivity/todos/41")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Still valid task",
                                  "description": "desc",
                                  "isDone": false,
                                  "priority": "LOW",
                                  "deadline": "2000-01-01T10:00:00"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Deadline cannot be in the past"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectMalformedDeadlineValue() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Task with broken deadline",
                                  "description": "desc",
                                  "isDone": false,
                                  "priority": "LOW",
                                  "deadline": "not-a-date"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_BODY"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectMalformedTodoBody() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_BODY"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectTodoCreateWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/productivity/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Task",
                                  "priority": "LOW"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectUnsupportedMethodForTodoCollection() throws Exception {
        mockMvc.perform(patch("/api/productivity/todos")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldDeleteTodoForAuthenticatedUser() throws Exception {
        mockMvc.perform(delete("/api/productivity/todos/41").with(csrf()))
                .andExpect(status().isOk());
    }
}
