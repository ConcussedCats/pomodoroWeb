package com.example.telos.service.device;

import com.example.telos.config.DeviceProperties;
import com.example.telos.dto.device.DeviceProtocolDtos.CommandAckRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.CommandAckResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceCommandPayload;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceCommandsResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceTargetState;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventBatchRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventBatchResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventPayload;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceEventResultDto;
import com.example.telos.dto.device.TimerSyncDtos.CommandDto;
import com.example.telos.dto.device.TimerSyncDtos.CreateCommandRequest;
import com.example.telos.dto.device.TimerSyncDtos.TargetStatePayload;
import com.example.telos.dto.device.TimerSyncDtos.TimerSnapshotPayload;
import com.example.telos.dto.device.TimerSyncDtos.TimerStateDto;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.UserTimeSettings;
import com.example.telos.model.device.CubeFace;
import com.example.telos.model.device.Device;
import com.example.telos.model.device.DeviceCommand;
import com.example.telos.model.device.DeviceCommandStatus;
import com.example.telos.model.device.DeviceCommandType;
import com.example.telos.model.device.DeviceConnectionStatus;
import com.example.telos.model.device.DeviceEvent;
import com.example.telos.model.device.DeviceEventResult;
import com.example.telos.model.device.DeviceEventType;
import com.example.telos.model.device.DeviceTimerState;
import com.example.telos.model.device.TimerMode;
import com.example.telos.model.device.TimerStatus;
import com.example.telos.model.history.SessionStatus;
import com.example.telos.repository.UserTimeSettingsRepository;
import com.example.telos.repository.device.DeviceCommandRepository;
import com.example.telos.repository.device.DeviceEventRepository;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.repository.device.DeviceTimerStateRepository;
import com.example.telos.security.device.DevicePrincipal;
import com.example.telos.service.device.TimerPhasePlanner.Position;
import com.example.telos.service.history.PomodoroSessionService;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Synchronized timer of a connected cube.
 * <p>
 * The cube is the only writer of the timer state: the server changes it only from device events,
 * command acknowledgements and heartbeats. The website sends commands and waits for the ack.
 * See docs/esp32/PROTOCOL.md sections 3-6.
 */
@Service
public class DeviceTimerService {
    private static final Set<DeviceCommandStatus> OPEN_COMMAND_STATUSES =
            EnumSet.of(DeviceCommandStatus.PENDING, DeviceCommandStatus.DELIVERED);

    private final DeviceTimerStateRepository stateRepository;
    private final DeviceCommandRepository commandRepository;
    private final DeviceEventRepository eventRepository;
    private final DeviceRepository deviceRepository;
    private final UserTimeSettingsRepository timeSettingsRepository;
    private final PomodoroSessionService sessionService;
    private final DevicePresenceService presenceService;
    private final DeviceUpdatesPublisher publisher;
    private final DeviceProperties properties;
    private final Clock clock;

    public DeviceTimerService(DeviceTimerStateRepository stateRepository,
                              DeviceCommandRepository commandRepository,
                              DeviceEventRepository eventRepository,
                              DeviceRepository deviceRepository,
                              UserTimeSettingsRepository timeSettingsRepository,
                              PomodoroSessionService sessionService,
                              DevicePresenceService presenceService,
                              DeviceUpdatesPublisher publisher,
                              DeviceProperties properties,
                              Clock clock) {
        this.stateRepository = stateRepository;
        this.commandRepository = commandRepository;
        this.eventRepository = eventRepository;
        this.deviceRepository = deviceRepository;
        this.timeSettingsRepository = timeSettingsRepository;
        this.sessionService = sessionService;
        this.presenceService = presenceService;
        this.publisher = publisher;
        this.properties = properties;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ state

    @Transactional
    public TimerStateDto getState(Long userId, Long deviceId) {
        Device device = ownedDevice(userId, deviceId);
        UserTimeSettings settings = ownerSettings(device.getUserId());
        DeviceTimerState state = stateRepository.findById(deviceId)
                .orElseGet(() -> stateRepository.save(initialState(deviceId, settings)));
        return toDto(state, settings);
    }

    @Transactional
    public TimerStateDto getStateForDevice(DevicePrincipal principal) {
        UserTimeSettings settings = ownerSettings(principal.userId());
        DeviceTimerState state = stateRepository.findById(principal.deviceId())
                .orElseGet(() -> stateRepository.save(initialState(principal.deviceId(), settings)));
        return toDto(state, settings);
    }

    public DeviceTimerState initialState(Long deviceId, UserTimeSettings settings) {
        return DeviceTimerState.initial(deviceId, TimerMode.WORK.durationSeconds(settings), clock.instant());
    }

    // ------------------------------------------------------------------ device -> server

    @Transactional
    public DeviceEventBatchResponse ingestEvents(DevicePrincipal principal, DeviceEventBatchRequest request) {
        // Lock order for one cube is always: timer state row first, then the devices row (no deadlocks).
        UserTimeSettings settings = ownerSettings(principal.userId());
        DeviceTimerState state = lockState(principal.deviceId(), settings);
        Device device = deviceRepository.findById(principal.deviceId())
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
        Instant receivedAt = clock.instant();
        String bootId = trimToNull(request.bootId());
        long versionBefore = state.getVersion();

        List<DeviceEventResultDto> results = new ArrayList<>();
        for (DeviceEventPayload event : request.events()) {
            results.add(ingestEvent(device, state, settings, bootId, event, receivedAt));
        }

        stateRepository.save(state);
        deviceRepository.save(device);
        TimerStateDto dto = toDto(state, settings);
        if (state.getVersion() != versionBefore) {
            publishState(device, dto);
        }
        return new DeviceEventBatchResponse(results, dto);
    }

    private DeviceEventResultDto ingestEvent(Device device, DeviceTimerState state, UserTimeSettings settings,
                                             String bootId, DeviceEventPayload event, Instant receivedAt) {
        UUID eventId = event.eventId();
        if (eventRepository.existsByDeviceIdAndEventId(device.getDeviceId(), eventId)) {
            return new DeviceEventResultDto(eventId, DeviceEventResult.DUPLICATE.name(), null);
        }

        Optional<DeviceEventType> type = parseEnum(DeviceEventType.class, event.type());
        if (type.isEmpty()) {
            return new DeviceEventResultDto(eventId, DeviceEventResult.REJECTED.name(), "INVALID_EVENT_TYPE");
        }
        CubeFace face = null;
        if (event.face() != null) {
            Optional<CubeFace> parsedFace = parseEnum(CubeFace.class, event.face());
            if (parsedFace.isEmpty()) {
                return new DeviceEventResultDto(eventId, DeviceEventResult.REJECTED.name(), "INVALID_FACE");
            }
            face = parsedFace.get();
        }

        Instant occurredAt = deviceTime(event.occurredAt(), receivedAt);
        DeviceEventResult result;
        String errorCode = null;

        if (isStale(state, bootId, event.seq())) {
            result = DeviceEventResult.STALE;
        } else {
            Optional<TimerSnapshot> snapshot;
            try {
                snapshot = resolveSnapshot(state, settings, type.get(), face, event.state(), occurredAt);
            } catch (DeviceApiException exception) {
                return new DeviceEventResultDto(eventId, DeviceEventResult.REJECTED.name(), exception.getErrorCode());
            }
            boolean changed = snapshot.isPresent() && applySnapshot(device, state, settings, snapshot.get(), occurredAt);
            result = changed ? DeviceEventResult.APPLIED : DeviceEventResult.IGNORED;
            if (bootId != null && event.seq() != null) {
                state.setLastBootId(bootId);
                state.setLastEventSeq(event.seq());
            }
            if (face != null) {
                device.setLastFace(face);
            }
        }

        DeviceEvent row = new DeviceEvent();
        row.setDeviceId(device.getDeviceId());
        row.setEventId(eventId);
        row.setBootId(bootId);
        row.setSeq(event.seq());
        row.setType(type.get());
        row.setFace(face);
        row.setResult(result);
        row.setOccurredAt(occurredAt);
        row.setReceivedAt(receivedAt);
        eventRepository.save(row);

        return new DeviceEventResultDto(eventId, result.name(), errorCode);
    }

    private boolean isStale(DeviceTimerState state, String bootId, Long seq) {
        return bootId != null
                && seq != null
                && bootId.equals(state.getLastBootId())
                && state.getLastEventSeq() != null
                && seq <= state.getLastEventSeq();
    }

    private Optional<TimerSnapshot> resolveSnapshot(DeviceTimerState state, UserTimeSettings settings, DeviceEventType type,
                                                    CubeFace face, TimerSnapshotPayload payload, Instant at) {
        if (payload != null) {
            return Optional.of(parseSnapshot(payload, at, TimerSnapshot.of(state)));
        }
        if (type == DeviceEventType.FACE_CHANGED && face != null) {
            return CubeFacePolicy.apply(face, TimerSnapshot.of(state), mode -> mode.durationSeconds(settings), at);
        }
        return Optional.empty();
    }

    /** Heartbeat state is treated as a STATE_SYNC event without a sequence number. */
    @Transactional
    public long syncFromHeartbeat(Device device, TimerSnapshotPayload payload) {
        UserTimeSettings settings = ownerSettings(device.getUserId());
        DeviceTimerState state = lockState(device.getDeviceId(), settings);
        if (payload != null) {
            Instant now = clock.instant();
            TimerSnapshot snapshot;
            try {
                snapshot = parseSnapshot(payload, now, TimerSnapshot.of(state));
            } catch (DeviceApiException exception) {
                return state.getVersion();
            }
            if (applySnapshot(device, state, settings, snapshot, now)) {
                stateRepository.save(state);
                publishState(device, toDto(state, settings));
            }
        }
        return state.getVersion();
    }

    // ------------------------------------------------------------------ server state transitions

    /**
     * Extra rules for handover commands: SET_STATE brings the browser's pattern position and session start,
     * RELEASE keeps the history session open because the browser continues it.
     */
    record TransitionOptions(Position positionOverride, Instant sessionStartedAt, boolean keepSessionOpen) {
        static final TransitionOptions NONE = new TransitionOptions(null, null, false);
    }

    boolean applySnapshot(Device device, DeviceTimerState state, UserTimeSettings settings, TimerSnapshot next, Instant at) {
        return applySnapshot(device, state, settings, next, at, TransitionOptions.NONE);
    }

    /**
     * Applies a device snapshot, keeps the pattern position and the session history in step.
     * Returns false when the snapshot does not change anything.
     */
    boolean applySnapshot(Device device, DeviceTimerState state, UserTimeSettings settings, TimerSnapshot next, Instant at,
                          TransitionOptions options) {
        TimerSnapshot previous = TimerSnapshot.of(state);
        if (next.sameAs(previous)) {
            return false;
        }

        TimerPhasePlanner planner = planner(settings);
        Position position = planner.normalize(state.getCycleIndex(), state.getPhaseIndex());
        boolean sameSession = Objects.equals(previous.sessionId(), next.sessionId());
        boolean previousActive = previous.sessionId() != null
                && (previous.status() == TimerStatus.RUNNING || previous.status() == TimerStatus.PAUSED);
        boolean newCountdown = next.sessionId() != null && !sameSession
                && (next.status() == TimerStatus.RUNNING || next.status() == TimerStatus.PAUSED);
        boolean justFinished = next.status() == TimerStatus.FINISHED
                && !(previous.status() == TimerStatus.FINISHED && sameSession);

        Long userId = device.getUserId();
        Long deviceId = device.getDeviceId();

        if (previousActive && !options.keepSessionOpen() && (!sameSession || next.status() == TimerStatus.STOPPED)) {
            int counted = previous.durationSeconds() - previous.remainingSecondsAt(at);
            sessionService.upsertDeviceSession(userId, deviceId, previous.sessionId(), previous.mode(),
                    previous.durationSeconds(), sessionStart(previous, at), SessionStatus.INTERRUPTED, counted, at);
        }

        if (newCountdown) {
            Instant startedAt = options.sessionStartedAt() != null
                    ? options.sessionStartedAt()
                    : (next.startedAt() != null ? next.startedAt() : at);
            sessionService.upsertDeviceSession(userId, deviceId, next.sessionId(), next.mode(),
                    next.durationSeconds(), startedAt, SessionStatus.IN_PROGRESS, 0, null);
            position = planner.onStart(position);
        }

        if (justFinished) {
            if (next.sessionId() != null) {
                Instant startedAt = at.minusSeconds(next.durationSeconds());
                sessionService.upsertDeviceSession(userId, deviceId, next.sessionId(), next.mode(),
                        next.durationSeconds(), startedAt, SessionStatus.COMPLETED, next.durationSeconds(), at);
            }
            position = planner.afterCompletion(position, next.mode());
        } else if (next.status() == TimerStatus.STOPPED && previous.status() != TimerStatus.STOPPED
                && !options.keepSessionOpen()) {
            // STOP is the reset of a connected timer, like the reset button of the browser timer.
            position = Position.START;
        }
        if (options.positionOverride() != null) {
            position = options.positionOverride();
        }

        state.setMode(next.mode());
        state.setStatus(next.status());
        state.setDurationSeconds(next.durationSeconds());
        state.setRemainingSeconds(next.remainingSeconds());
        state.setStartedAt(next.status() == TimerStatus.RUNNING ? next.startedAt() : null);
        state.setPausedAt(next.status() == TimerStatus.PAUSED ? next.pausedAt() : null);
        state.setSessionId(next.sessionId());
        state.setCycleIndex(position.cycleIndex());
        state.setPhaseIndex(position.phaseIndex());
        state.setVersion(state.getVersion() + 1);
        state.setUpdatedAt(clock.instant());
        return true;
    }

    private Instant sessionStart(TimerSnapshot snapshot, Instant fallback) {
        int counted = snapshot.durationSeconds() - snapshot.remainingSecondsAt(fallback);
        return fallback.minusSeconds(Math.max(0, counted));
    }

    // ------------------------------------------------------------------ website -> device commands

    @Transactional
    public CommandDto createCommand(Long userId, Long deviceId, CreateCommandRequest request) {
        Device device = ownedDevice(userId, deviceId);
        DeviceCommandType type = DeviceCommandType.valueOf(request.type());
        TimerMode mode = null;
        if (type.requiresMode()) {
            if (request.mode() == null || request.mode().isBlank()) {
                throw DeviceApiException.badRequest("MODE_REQUIRED", type + " needs a mode");
            }
            mode = TimerMode.parse(request.mode())
                    .orElseThrow(() -> DeviceApiException.badRequest("INVALID_MODE", "Unknown mode"));
        }

        String clientRequestId = trimToNull(request.clientRequestId());
        if (clientRequestId != null) {
            Optional<DeviceCommand> existing = commandRepository.findByDeviceIdAndClientRequestId(deviceId, clientRequestId);
            if (existing.isPresent()) {
                return toDto(existing.get());
            }
        }

        if (presenceService.effectiveStatus(device) != DeviceConnectionStatus.ONLINE) {
            throw DeviceApiException.conflict("DEVICE_OFFLINE", "The cube is offline, the command cannot be delivered");
        }
        if (pendingCommandCount(deviceId) > 0) {
            throw DeviceApiException.conflict("COMMAND_IN_PROGRESS", "Wait until the cube confirms the previous command");
        }

        Instant now = clock.instant();
        DeviceCommand command = new DeviceCommand();
        if (type == DeviceCommandType.SET_STATE) {
            applyTarget(command, request.targetState(), now);
        }
        command.setCommandId(UUID.randomUUID());
        command.setDeviceId(deviceId);
        command.setCreatedByUserId(userId);
        command.setType(type);
        command.setTargetMode(mode);
        command.setStatus(DeviceCommandStatus.PENDING);
        command.setClientRequestId(clientRequestId);
        command.setCreatedAt(now);
        command.setExpiresAt(now.plus(properties.commandTtl()));
        commandRepository.save(command);

        CommandDto dto = toDto(command);
        publisher.publish(device.getUserId(), "COMMAND", deviceId, "command", dto);
        return dto;
    }

    private void applyTarget(DeviceCommand command, TargetStatePayload target, Instant now) {
        if (target == null) {
            throw DeviceApiException.badRequest("TARGET_REQUIRED", "SET_STATE needs targetState");
        }
        TimerStatus status = parseEnum(TimerStatus.class, target.status())
                .filter(value -> value == TimerStatus.RUNNING || value == TimerStatus.PAUSED)
                .orElseThrow(() -> DeviceApiException.badRequest("INVALID_TARGET", "targetState.status must be RUNNING or PAUSED"));
        Integer duration = target.durationSeconds();
        if (duration == null || duration <= 0 || duration > TimerSnapshot.MAX_DURATION_SECONDS) {
            throw DeviceApiException.badRequest("INVALID_TARGET", "targetState.durationSeconds is invalid");
        }
        if (status == TimerStatus.RUNNING) {
            if (target.endsAt() == null) {
                throw DeviceApiException.badRequest("INVALID_TARGET", "A running target needs endsAt");
            }
            Instant endsAt = Instant.ofEpochMilli(target.endsAt());
            long millisLeft = endsAt.toEpochMilli() - now.toEpochMilli();
            if (millisLeft <= 0 || millisLeft > duration * 1000L + 2_000) {
                throw DeviceApiException.badRequest("INVALID_TARGET", "targetState.endsAt is outside the phase");
            }
            command.setTargetEndsAt(endsAt);
        } else {
            Integer remaining = target.remainingSeconds();
            if (remaining == null || remaining < 0 || remaining > duration) {
                throw DeviceApiException.badRequest("INVALID_TARGET", "targetState.remainingSeconds is invalid");
            }
            command.setTargetRemainingSeconds(remaining);
        }
        command.setTargetStatus(status);
        command.setTargetDurationSeconds(duration);
        command.setTargetSessionId(target.sessionId() != null ? target.sessionId() : UUID.randomUUID());
        if (target.sessionStartedAt() != null && target.sessionStartedAt() > 0) {
            Instant startedAt = Instant.ofEpochMilli(target.sessionStartedAt());
            command.setTargetSessionStartedAt(startedAt.isAfter(now) ? now : startedAt);
        }
        if (target.cycleIndex() != null && target.cycleIndex() >= 0) {
            command.setTargetCycleIndex(target.cycleIndex());
        }
        if (target.phaseIndex() != null && target.phaseIndex() >= 0) {
            command.setTargetPhaseIndex(target.phaseIndex());
        }
    }

    private DeviceTargetState targetFor(DeviceCommand command, Instant now) {
        if (command.getType() != DeviceCommandType.SET_STATE || command.getTargetStatus() == null) {
            return null;
        }
        int duration = command.getTargetDurationSeconds();
        int remaining;
        if (command.getTargetStatus() == TimerStatus.RUNNING) {
            long millisLeft = command.getTargetEndsAt().toEpochMilli() - now.toEpochMilli();
            remaining = (int) Math.min(duration, Math.max(0, (millisLeft + 999) / 1000));
        } else {
            remaining = command.getTargetRemainingSeconds();
        }
        return new DeviceTargetState(
                command.getTargetStatus().name(),
                duration,
                remaining,
                command.getTargetEndsAt() == null ? null : command.getTargetEndsAt().toEpochMilli(),
                command.getTargetSessionId()
        );
    }

    private TransitionOptions optionsFor(DeviceCommand command, UserTimeSettings settings) {
        if (command.getType() == DeviceCommandType.RELEASE) {
            return new TransitionOptions(null, null, true);
        }
        if (command.getType() == DeviceCommandType.SET_STATE) {
            Position position = command.getTargetCycleIndex() == null || command.getTargetPhaseIndex() == null
                    ? null
                    : planner(settings).normalize(command.getTargetCycleIndex(), command.getTargetPhaseIndex());
            return new TransitionOptions(position, command.getTargetSessionStartedAt(), false);
        }
        return TransitionOptions.NONE;
    }

    @Transactional(readOnly = true)
    public List<CommandDto> recentCommands(Long userId, Long deviceId) {
        ownedDevice(userId, deviceId);
        return commandRepository.findTop20ByDeviceIdOrderByCreatedAtDesc(deviceId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long pendingCommandCount(Long deviceId) {
        return commandRepository.countByDeviceIdAndStatusInAndExpiresAtAfter(deviceId, OPEN_COMMAND_STATUSES, clock.instant());
    }

    /** At-least-once delivery: DELIVERED commands are returned again until they are acked or expire. */
    @Transactional
    public DeviceCommandsResponse pollCommands(DevicePrincipal principal) {
        Instant now = clock.instant();
        List<DeviceCommand> commands = commandRepository
                .findByDeviceIdAndStatusInAndExpiresAtAfterOrderByCreatedAtAsc(principal.deviceId(), OPEN_COMMAND_STATUSES, now);

        List<DeviceCommandPayload> payload = new ArrayList<>();
        for (DeviceCommand command : commands) {
            if (command.getStatus() == DeviceCommandStatus.PENDING) {
                command.setStatus(DeviceCommandStatus.DELIVERED);
                command.setDeliveredAt(now);
                commandRepository.save(command);
                publisher.publish(principal.userId(), "COMMAND", principal.deviceId(), "command", toDto(command));
            }
            payload.add(new DeviceCommandPayload(
                    command.getCommandId(),
                    command.getType().name(),
                    command.getTargetMode() == null ? null : command.getTargetMode().name(),
                    command.getCreatedAt().toEpochMilli(),
                    command.getExpiresAt().toEpochMilli(),
                    targetFor(command, now)
            ));
        }
        return new DeviceCommandsResponse(payload);
    }

    @Transactional(noRollbackFor = DeviceApiException.class)
    public CommandAckResponse acknowledge(DevicePrincipal principal, UUID commandId, CommandAckRequest request) {
        UserTimeSettings settings = ownerSettings(principal.userId());
        DeviceTimerState state = lockState(principal.deviceId(), settings);
        DeviceCommand command = commandRepository.findByCommandIdAndDeviceId(commandId, principal.deviceId())
                .orElseThrow(() -> new DeviceApiException(HttpStatus.NOT_FOUND, "COMMAND_NOT_FOUND", "Command not found"));
        Device device = deviceRepository.findById(principal.deviceId())
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
        Instant now = clock.instant();

        if (command.getStatus() == DeviceCommandStatus.EXECUTED || command.getStatus() == DeviceCommandStatus.REJECTED) {
            // Repeated ack (e.g. the response was lost): same answer, nothing changes.
            return new CommandAckResponse(command.getCommandId(), command.getStatus().name(), toDto(state, settings));
        }
        if (command.getStatus() == DeviceCommandStatus.EXPIRED || !now.isBefore(command.getExpiresAt())) {
            markExpired(command, device.getUserId(), now);
            throw new DeviceApiException(HttpStatus.GONE, "COMMAND_EXPIRED", "The command expired and must not be executed");
        }

        boolean executed = "EXECUTED".equals(request.result());
        boolean changed = false;

        if (executed && request.state() == null) {
            throw DeviceApiException.badRequest("STATE_REQUIRED", "An executed command must report the resulting state");
        }
        if (request.state() != null) {
            TimerSnapshot snapshot = parseSnapshot(request.state(), now, TimerSnapshot.of(state));
            TransitionOptions options = executed ? optionsFor(command, settings) : TransitionOptions.NONE;
            changed = applySnapshot(device, state, settings, snapshot, now, options);
            if (!changed && options.positionOverride() != null) {
                Position position = options.positionOverride();
                changed = position.cycleIndex() != state.getCycleIndex() || position.phaseIndex() != state.getPhaseIndex();
                if (changed) {
                    state.setCycleIndex(position.cycleIndex());
                    state.setPhaseIndex(position.phaseIndex());
                    state.setVersion(state.getVersion() + 1);
                    state.setUpdatedAt(now);
                }
            }
        }
        stateRepository.save(state);

        DeviceCommandStatus finalStatus = executed ? DeviceCommandStatus.EXECUTED : DeviceCommandStatus.REJECTED;
        String errorCode = executed ? null : Optional.ofNullable(trimToNull(request.errorCode())).orElse("REJECTED");
        // Conditional update: if the expiry sweep won the race, the command stays EXPIRED.
        if (commandRepository.complete(commandId, OPEN_COMMAND_STATUSES, finalStatus, errorCode, now, state.getVersion()) != 1) {
            throw new DeviceApiException(HttpStatus.GONE, "COMMAND_EXPIRED", "The command expired and must not be executed");
        }
        command.setStatus(finalStatus);
        command.setErrorCode(errorCode);
        command.setCompletedAt(now);
        command.setResultingVersion(state.getVersion());

        TimerStateDto dto = toDto(state, settings);
        publisher.publish(device.getUserId(), "COMMAND", device.getDeviceId(), "command", toDto(command));
        if (changed) {
            publishState(device, dto);
        }
        return new CommandAckResponse(command.getCommandId(), command.getStatus().name(), dto);
    }

    /** Commands that were not acked in time are never executed later. */
    @Transactional
    public int expireOverdueCommands() {
        Instant now = clock.instant();
        List<DeviceCommand> overdue = commandRepository.findByStatusInAndExpiresAtLessThanEqual(OPEN_COMMAND_STATUSES, now);
        for (DeviceCommand command : overdue) {
            Long ownerId = deviceRepository.findById(command.getDeviceId()).map(Device::getUserId).orElse(null);
            markExpired(command, ownerId, now);
        }
        return overdue.size();
    }

    private void markExpired(DeviceCommand command, Long ownerId, Instant now) {
        if (command.getStatus().isFinal()) {
            return;
        }
        // Conditional update: a concurrent ack that already completed the command wins.
        if (commandRepository.complete(command.getCommandId(), OPEN_COMMAND_STATUSES,
                DeviceCommandStatus.EXPIRED, null, now, null) != 1) {
            return;
        }
        command.setStatus(DeviceCommandStatus.EXPIRED);
        command.setCompletedAt(now);
        if (ownerId != null) {
            publisher.publish(ownerId, "COMMAND", command.getDeviceId(), "command", toDto(command));
        }
    }

    // ------------------------------------------------------------------ helpers

    private Device ownedDevice(Long userId, Long deviceId) {
        return deviceRepository.findByDeviceIdAndUserId(deviceId, userId)
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
    }

    /** Creates the timer state row of a freshly paired cube, so later requests never race to create it. */
    @Transactional
    public void ensureState(Long deviceId, Long userId) {
        if (!stateRepository.existsById(deviceId)) {
            stateRepository.save(initialState(deviceId, ownerSettings(userId)));
        }
    }

    /** Takes the row lock of the cube's timer state; call it before changing the devices row. */
    @Transactional
    public void lockForDevice(Long deviceId, Long userId) {
        lockState(deviceId, ownerSettings(userId));
    }

    private DeviceTimerState lockState(Long deviceId, UserTimeSettings settings) {
        return stateRepository.findForUpdate(deviceId).orElseGet(() -> {
            stateRepository.saveAndFlush(initialState(deviceId, settings));
            return stateRepository.findForUpdate(deviceId).orElseThrow();
        });
    }

    public UserTimeSettings ownerSettings(Long userId) {
        return timeSettingsRepository.findByUser_UserId(userId).orElse(null);
    }

    public TimerPhasePlanner planner(UserTimeSettings settings) {
        return settings == null
                ? new TimerPhasePlanner(TimerPhasePlanner.CLASSIC, 4)
                : new TimerPhasePlanner(settings.getPatternType(), settings.getPomoCycles());
    }

    private void publishState(Device device, TimerStateDto dto) {
        publisher.publish(device.getUserId(), "TIMER_STATE", device.getDeviceId(), "state", dto);
    }

    /** Device time, falling back to receive time when the clock is not synced and never in the future. */
    private Instant deviceTime(Long epochMillis, Instant receivedAt) {
        if (epochMillis == null || epochMillis <= 0) {
            return receivedAt;
        }
        Instant value = Instant.ofEpochMilli(epochMillis);
        return value.isAfter(receivedAt) ? receivedAt : value;
    }

    TimerSnapshot parseSnapshot(TimerSnapshotPayload payload, Instant at, TimerSnapshot previous) {
        TimerMode mode = TimerMode.parse(payload.mode())
                .orElseThrow(() -> DeviceApiException.badRequest("INVALID_MODE", "Unknown timer mode"));
        TimerStatus status = parseEnum(TimerStatus.class, payload.status())
                .orElseThrow(() -> DeviceApiException.badRequest("INVALID_STATE", "Unknown timer status"));
        if (payload.durationSeconds() == null || payload.remainingSeconds() == null) {
            throw DeviceApiException.badRequest("INVALID_STATE", "durationSeconds and remainingSeconds are required");
        }

        Instant startedAt = null;
        Instant pausedAt = null;
        int remaining = status == TimerStatus.FINISHED ? 0 : payload.remainingSeconds();
        if (status == TimerStatus.RUNNING) {
            boolean sameRun = previous != null
                    && previous.status() == TimerStatus.RUNNING
                    && previous.mode() == mode
                    && previous.durationSeconds() == payload.durationSeconds()
                    && java.util.Objects.equals(previous.sessionId(), payload.sessionId());
            if (payload.endsAt() != null) {
                // The phase end on the server clock (PROTOCOL.md 1.6) is the most precise description.
                long millisLeft = payload.endsAt() - at.toEpochMilli();
                remaining = (int) Math.max(0, (millisLeft + 999) / 1000);
                startedAt = Instant.ofEpochMilli(payload.endsAt()).minusSeconds(remaining);
                if (sameRun && Math.abs(endsAtOf(previous) - payload.endsAt()) < END_TOLERANCE_MILLIS) {
                    return previous;
                }
            } else if (payload.startedAt() == null && sameRun) {
                // Unsynced clock and the countdown we already track: not a change.
                return previous;
            } else {
                startedAt = deviceTime(payload.startedAt(), at);
                if (sameRun && Math.abs(endsAtOf(previous) - (startedAt.toEpochMilli() + remaining * 1000L))
                        < END_TOLERANCE_MILLIS) {
                    return previous;
                }
            }
        }
        if (status == TimerStatus.PAUSED) {
            pausedAt = deviceTime(payload.pausedAt(), at);
        }

        TimerSnapshot snapshot = new TimerSnapshot(mode, status, payload.durationSeconds(), remaining,
                startedAt, pausedAt, payload.sessionId());
        String error = snapshot.validationError();
        if (error != null) {
            throw DeviceApiException.badRequest(error, "Inconsistent timer state");
        }
        return snapshot;
    }

    public TimerStateDto toDto(DeviceTimerState state, UserTimeSettings settings) {
        TimerPhasePlanner planner = planner(settings);
        Position position = planner.normalize(state.getCycleIndex(), state.getPhaseIndex());
        boolean completed = planner.isCompleted(position);
        Long startedAt = state.getStartedAt() == null ? null : state.getStartedAt().toEpochMilli();
        Long endsAt = state.getStatus() == TimerStatus.RUNNING && startedAt != null
                ? startedAt + state.getRemainingSeconds() * 1000L
                : null;
        TimerMode suggested = state.getStatus() == TimerStatus.FINISHED || state.getStatus() == TimerStatus.STOPPED
                ? planner.modeAt(position)
                : null;

        return new TimerStateDto(
                state.getDeviceId(),
                state.getMode().name(),
                state.getMode().getWebMode(),
                state.getStatus().name(),
                state.getDurationSeconds(),
                state.getRemainingSeconds(),
                startedAt,
                state.getPausedAt() == null ? null : state.getPausedAt().toEpochMilli(),
                endsAt,
                state.getSessionId(),
                completed ? planner.totalCycles() - 1 : position.cycleIndex(),
                position.phaseIndex(),
                planner.totalCycles(),
                planner.workPhasesPerCycle(),
                planner.filledDots(position),
                planner.patternType(),
                completed,
                suggested == null ? null : suggested.name(),
                state.getVersion(),
                state.getUpdatedAt() == null ? null : state.getUpdatedAt().toEpochMilli(),
                clock.millis()
        );
    }

    public CommandDto toDto(DeviceCommand command) {
        return new CommandDto(
                command.getCommandId(),
                command.getDeviceId(),
                command.getType().name(),
                command.getTargetMode() == null ? null : command.getTargetMode().name(),
                command.getStatus().name(),
                command.getErrorCode(),
                command.getCreatedAt().toEpochMilli(),
                command.getExpiresAt().toEpochMilli(),
                command.getCompletedAt() == null ? null : command.getCompletedAt().toEpochMilli(),
                command.getResultingVersion()
        );
    }

    private static <E extends Enum<E>> Optional<E> parseEnum(Class<E> type, String value) {
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Enum.valueOf(type, value.trim()));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private static final long END_TOLERANCE_MILLIS = 1_500;

    private static long endsAtOf(TimerSnapshot snapshot) {
        return snapshot.startedAt() == null
                ? Long.MIN_VALUE / 2
                : snapshot.startedAt().toEpochMilli() + snapshot.remainingSeconds() * 1000L;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
