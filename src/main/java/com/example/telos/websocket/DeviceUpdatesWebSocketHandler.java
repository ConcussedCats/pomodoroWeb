package com.example.telos.websocket;

import com.example.telos.service.CurrentUserService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.security.Principal;

/**
 * /ws/devices — one socket per browser tab. Access requires the normal login session
 * (enforced by Spring Security on the handshake). The channel is server -> browser only;
 * every action goes through the REST API with CSRF protection.
 */
@Component
public class DeviceUpdatesWebSocketHandler extends TextWebSocketHandler {
    private static final String USER_ID = "telos.userId";
    private static final String SAFE_SESSION = "telos.safeSession";

    private final DeviceUpdatesPublisher publisher;
    private final CurrentUserService currentUserService;

    public DeviceUpdatesWebSocketHandler(DeviceUpdatesPublisher publisher, CurrentUserService currentUserService) {
        this.publisher = publisher;
        this.currentUserService = currentUserService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Principal principal = session.getPrincipal();
        if (principal == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        Long userId = currentUserService.userId(principal);
        session.getAttributes().put(USER_ID, userId);
        session.getAttributes().put(SAFE_SESSION, publisher.register(userId, session));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        if ("ping".equals(message.getPayload())) {
            Object safeSession = session.getAttributes().get(SAFE_SESSION);
            if (safeSession instanceof WebSocketSession target) {
                target.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
            }
        }
        // Anything else from the browser is ignored on purpose.
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object userId = session.getAttributes().get(USER_ID);
        if (userId instanceof Long id) {
            Object safeSession = session.getAttributes().get(SAFE_SESSION);
            publisher.unregister(id, safeSession instanceof WebSocketSession target ? target : session);
        }
    }
}
