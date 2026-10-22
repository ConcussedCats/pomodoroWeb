package com.example.telos.controller.api.session;

import com.example.telos.dto.history.HistoryDtos.RecordSessionRequest;
import com.example.telos.dto.history.HistoryDtos.SessionDto;
import com.example.telos.dto.history.HistoryDtos.SessionPageDto;
import com.example.telos.dto.history.HistoryDtos.SessionStatsDto;
import com.example.telos.service.CurrentUserService;
import com.example.telos.service.history.PomodoroSessionService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@AllArgsConstructor
@RestController
@RequestMapping("/api/pomodoro-sessions")
public class PomodoroSessionRestController {
    private final CurrentUserService currentUserService;
    private final PomodoroSessionService sessionService;

    @GetMapping
    public SessionPageDto history(Principal principal,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return sessionService.history(currentUserService.userId(principal), page, size);
    }

    @GetMapping("/stats")
    public SessionStatsDto stats(Principal principal, @RequestParam(required = false) String tz) {
        return sessionService.stats(currentUserService.userId(principal), tz);
    }

    @PostMapping
    public ResponseEntity<SessionDto> record(Principal principal, @Valid @RequestBody RecordSessionRequest request) {
        PomodoroSessionService.Recorded recorded = sessionService.recordWebSession(currentUserService.userId(principal), request);
        return ResponseEntity.status(recorded.created() ? HttpStatus.CREATED : HttpStatus.OK).body(recorded.session());
    }
}
