package com.example.telos.controller.api.session;

import com.example.telos.dto.device.DeviceDtos.DeviceDto;
import com.example.telos.dto.device.DeviceDtos.DeviceSettingsDto;
import com.example.telos.dto.device.DeviceDtos.RenameDeviceRequest;
import com.example.telos.dto.device.DeviceDtos.UpdateDeviceSettingsRequest;
import com.example.telos.dto.device.TimerSyncDtos.CommandDto;
import com.example.telos.dto.device.TimerSyncDtos.CreateCommandRequest;
import com.example.telos.dto.device.TimerSyncDtos.TimerStateDto;
import com.example.telos.service.CurrentUserService;
import com.example.telos.service.device.DeviceService;
import com.example.telos.service.device.DeviceSettingsService;
import com.example.telos.service.device.DeviceTimerService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/** Devices of the logged-in user (see docs/esp32/WEB-API.md). */
@AllArgsConstructor
@RestController
@RequestMapping("/api/devices")
public class DeviceRestController {
    private final CurrentUserService currentUserService;
    private final DeviceService deviceService;
    private final DeviceSettingsService settingsService;
    private final DeviceTimerService timerService;

    @GetMapping
    public List<DeviceDto> list(Principal principal) {
        return deviceService.list(currentUserService.userId(principal));
    }

    @GetMapping("/{deviceId}")
    public DeviceDto get(Principal principal, @PathVariable Long deviceId) {
        return deviceService.get(currentUserService.userId(principal), deviceId);
    }

    @PatchMapping("/{deviceId}")
    public DeviceDto rename(Principal principal, @PathVariable Long deviceId, @Valid @RequestBody RenameDeviceRequest request) {
        return deviceService.rename(currentUserService.userId(principal), deviceId, request.name());
    }

    @DeleteMapping("/{deviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unbind(Principal principal, @PathVariable Long deviceId) {
        deviceService.unbind(currentUserService.userId(principal), deviceId);
    }

    @GetMapping("/{deviceId}/state")
    public TimerStateDto state(Principal principal, @PathVariable Long deviceId) {
        return timerService.getState(currentUserService.userId(principal), deviceId);
    }

    @PostMapping("/{deviceId}/commands")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CommandDto command(Principal principal, @PathVariable Long deviceId, @Valid @RequestBody CreateCommandRequest request) {
        return timerService.createCommand(currentUserService.userId(principal), deviceId, request);
    }

    @GetMapping("/{deviceId}/commands")
    public List<CommandDto> commands(Principal principal, @PathVariable Long deviceId) {
        return timerService.recentCommands(currentUserService.userId(principal), deviceId);
    }

    @GetMapping("/{deviceId}/settings")
    public DeviceSettingsDto settings(Principal principal, @PathVariable Long deviceId) {
        return settingsService.get(currentUserService.userId(principal), deviceId);
    }

    @PutMapping("/{deviceId}/settings")
    public DeviceSettingsDto updateSettings(Principal principal, @PathVariable Long deviceId,
                                            @Valid @RequestBody UpdateDeviceSettingsRequest request) {
        return settingsService.update(currentUserService.userId(principal), deviceId, request);
    }
}
