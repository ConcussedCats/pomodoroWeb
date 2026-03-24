package com.example.telos.controller;

import com.example.telos.dto.NoteDto;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.repository.NoteRepository;
import com.example.telos.service.NoteService;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/api/productivity/note")
public class NoteRestController {
    private final UserService userService;
    NoteService noteService;

    @GetMapping
    public List<NoteResponseDto> getNotes(Principal principal) {
        return noteService.getUserNotes(principal.getName());
    }
}
