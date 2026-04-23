package com.example.telos.api;

import com.example.telos.controller.api.session.NoteRestController;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.exception.RestExceptionHandler;
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

@WebMvcTest(NoteRestController.class)
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SessionApiWebMvcTestConfig.class
})
@Tag("contract")
class NoteRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubNoteService noteService;

    @BeforeEach
    void setUp() {
        noteService.reset();
    }

    @Test
    void shouldRejectAnonymousNoteListRequest() throws Exception {
        mockMvc.perform(get("/api/productivity/notes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldReturnNotesForAuthenticatedUser() throws Exception {
        noteService.nextNotes = List.of(new NoteResponseDto(
                12L,
                "Persisted note",
                LocalDateTime.of(2026, 4, 23, 12, 58),
                null
        ));

        mockMvc.perform(get("/api/productivity/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].noteId").value(12))
                .andExpect(jsonPath("$[0].noteText").value("Persisted note"))
                .andExpect(jsonPath("$[0].createdAt").value("2026-04-23T12:58:00"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldCreateNoteForAuthenticatedUser() throws Exception {
        mockMvc.perform(post("/api/productivity/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "noteText": "Remember to verify deadline recovery"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Note was created successfully"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectBlankNote() throws Exception {
        mockMvc.perform(post("/api/productivity/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "noteText": "   "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Note text cannot be empty"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectForbidden67Note() throws Exception {
        mockMvc.perform(post("/api/productivity/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "noteText": " SIX   SEVEN "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("67 and six seven are not allowed here"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectMalformedNoteBody() throws Exception {
        mockMvc.perform(post("/api/productivity/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "noteText":
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_BODY"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectNoteCreateWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/productivity/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "noteText": "Task note"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectUnsupportedMethodForNoteCollection() throws Exception {
        mockMvc.perform(patch("/api/productivity/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldDeleteNoteForAuthenticatedUser() throws Exception {
        mockMvc.perform(delete("/api/productivity/notes/12").with(csrf()))
                .andExpect(status().isOk());
    }
}
