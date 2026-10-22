package com.example.telos.controller.api.session;

import com.example.telos.dto.device.DeviceDtos.PairingCreatedDto;
import com.example.telos.dto.device.DeviceDtos.PairingStatusDto;
import com.example.telos.service.CurrentUserService;
import com.example.telos.service.device.DevicePairingService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@AllArgsConstructor
@RestController
@RequestMapping("/api/device-pairings")
public class DevicePairingRestController {
    private final CurrentUserService currentUserService;
    private final DevicePairingService pairingService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PairingCreatedDto create(Principal principal) {
        return pairingService.create(currentUserService.userId(principal));
    }

    @GetMapping("/{pairingId}")
    public PairingStatusDto status(Principal principal, @PathVariable Long pairingId) {
        return pairingService.status(currentUserService.userId(principal), pairingId);
    }
}
