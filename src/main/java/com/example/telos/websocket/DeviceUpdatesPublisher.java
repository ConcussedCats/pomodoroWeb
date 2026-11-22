package com.example.telos.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Pushes device updates to the browser tabs of the owning user.
 * Sessions live in memory, so this works for a single application instance (the current deployment).
 */
@Component
public class DeviceUpdatesPublisher {
    private static final Logger logger = LoggerFactory.getLogger(DeviceUpdatesPublisher.class);
    private static final int SEND_TIME_LIMIT_MS = 5_000;
    private static final int BUFFER_LIMIT_BYTES = 64 * 1024;

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public DeviceUpdatesPublisher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public WebSocketSession register(Long userId, WebSocketSession session) {
        WebSocketSession safeSession = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_LIMIT_BYTES);
        sessionsByUser.computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet()).add(safeSession);
        return safeSession;
    }

    public void unregister(Long userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null) {
            return;
        }
        sessions.removeIf(candidate -> candidate == session || candidate.getId().equals(session.getId()));
        if (sessions.isEmpty()) {
            sessionsByUser.remove(userId, sessions);
        }
    }

    /** Closes the sockets opened with the given HTTP session (called on logout and session expiry). */
    public void closeForHttpSession(String httpSessionId) {
        if (httpSessionId == null) {
            return;
        }
        sessionsByUser.values().forEach(sessions -> sessions.removeIf(session -> {
            Object owner = session.getAttributes().get(HttpSessionHandshakeInterceptor.HTTP_SESSION_ID_ATTR_NAME);
            if (!httpSessionId.equals(owner)) {
                return false;
            }
            closeQuietly(session, CloseStatus.POLICY_VIOLATION);
            return true;
        }));
    }

    public int connectedSessions(Long userId) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        return sessions == null ? 0 : sessions.size();
    }

    /** Sends {"type": type, "deviceId": deviceId, key: value} to the user, after the current transaction commits. */
    public void publish(Long userId, String type, Long deviceId, String key, Object value) {
        Map<String, Object> fields = new LinkedHashMap<>();
        if (key != null) {
            fields.put(key, value);
        }
        publish(userId, type, deviceId, fields);
    }

    /** Sends {"type": type, "deviceId": deviceId, ...fields} to the user, after the current transaction commits. */
    public void publish(Long userId, String type, Long deviceId, Map<String, Object> fields) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("type", type);
        message.put("deviceId", deviceId);
        message.putAll(fields);
        afterCommit(() -> send(userId, message));
    }

    private void send(Long userId, Map<String, Object> message) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        TextMessage textMessage;
        try {
            textMessage = new TextMessage(objectMapper.writeValueAsString(message));
        } catch (JsonProcessingException exception) {
            logger.warn("Failed to serialize device update {}", message.get("type"), exception);
            return;
        }

        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            try {
                session.sendMessage(textMessage);
            } catch (IOException | IllegalStateException exception) {
                logger.debug("Dropping broken device update socket {}", session.getId(), exception);
                sessions.remove(session);
                closeQuietly(session, CloseStatus.SESSION_NOT_RELIABLE);
            }
        }
    }

    private void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException ignored) {
            // already broken
        }
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }
}
