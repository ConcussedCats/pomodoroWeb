package com.example.telos.controller.api.device;

import com.example.telos.dto.device.DeviceProtocolDtos.CommandAckRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.CommandAckResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceCommandsResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceConfigResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventBatchRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventBatchResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.HeartbeatRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.HeartbeatResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.PairRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.PairResponse;
import com.example.telos.security.device.DevicePrincipal;
import com.example.telos.service.device.DevicePairingService;
import com.example.telos.service.device.DeviceProtocolService;
import com.example.telos.service.device.DeviceTimerService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Endpoints called by the ESP32 firmware (docs/esp32/PROTOCOL.md).
 * Authentication: "Authorization: Device &lt;secret&gt;" + "X-Device-Id", except for pairing.
 */
@AllArgsConstructor
@RestController
public class DeviceApiController {
    private final DevicePairingService pairingService;
    private final DeviceProtocolService protocolService;
    private final DeviceTimerService timerService;

    @PostMapping("/api/devices/pair")
    @ResponseStatus(HttpStatus.CREATED)
    public PairResponse pair(@Valid @RequestBody PairRequest request) {
        return pairingService.claim(request);
    }

    @PostMapping("/api/devices/heartbeat")
    public HeartbeatResponse heartbeat(@AuthenticationPrincipal DevicePrincipal device,
                                       @Valid @RequestBody HeartbeatRequest request) {
        return protocolService.heartbeat(device, request);
    }

    @GetMapping("/api/device/config")
    public DeviceConfigResponse config(@AuthenticationPrincipal DevicePrincipal device) {
        return protocolService.config(device);
    }

    @PostMapping("/api/device/events")
    public DeviceEventBatchResponse events(@AuthenticationPrincipal DevicePrincipal device,
                                           @Valid @RequestBody DeviceEventBatchRequest request) {
        return timerService.ingestEvents(device, request);
    }

    @GetMapping("/api/device/commands")
    public DeviceCommandsResponse commands(@AuthenticationPrincipal DevicePrincipal device) {
        return timerService.pollCommands(device);
    }

    @PostMapping("/api/device/commands/{commandId}/ack")
    public CommandAckResponse ack(@AuthenticationPrincipal DevicePrincipal device,
                                  @PathVariable UUID commandId,
                                  @Valid @RequestBody CommandAckRequest request) {
        return timerService.acknowledge(device, commandId, request);
    }
}
