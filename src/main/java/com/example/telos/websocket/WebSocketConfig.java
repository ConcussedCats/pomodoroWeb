package com.example.telos.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final DeviceUpdatesWebSocketHandler deviceUpdatesHandler;

    public WebSocketConfig(DeviceUpdatesWebSocketHandler deviceUpdatesHandler) {
        this.deviceUpdatesHandler = deviceUpdatesHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // No allowed origins configured: Spring accepts only same-origin handshakes (CSWSH protection).
        // The HTTP session id is kept on the socket so logout / session expiry can close it.
        registry.addHandler(deviceUpdatesHandler, "/ws/devices")
                .addInterceptors(new HttpSessionHandshakeInterceptor());
    }
}
