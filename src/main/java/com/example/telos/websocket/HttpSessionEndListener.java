package com.example.telos.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.security.web.session.HttpSessionDestroyedEvent;
import org.springframework.security.web.session.HttpSessionEventPublisher;

/** A logged-out or expired browser session must stop receiving device updates. */
@Configuration
public class HttpSessionEndListener {
    private final DeviceUpdatesPublisher publisher;

    public HttpSessionEndListener(DeviceUpdatesPublisher publisher) {
        this.publisher = publisher;
    }

    /** Turns servlet session events into Spring events (HttpSessionDestroyedEvent). */
    @Bean
    public static HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    @EventListener
    public void onSessionDestroyed(HttpSessionDestroyedEvent event) {
        publisher.closeForHttpSession(event.getId());
    }
}
