package com.example.telos.security.device;

import com.example.telos.service.device.DevicePresenceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates ESP32 requests with "Authorization: Device &lt;secret&gt;" and "X-Device-Id: &lt;hardwareId&gt;".
 * Only registered in the device security chain, never as a global servlet filter.
 */
public class DeviceAuthenticationFilter extends OncePerRequestFilter {
    public static final String AUTH_SCHEME = "Device ";
    public static final String HARDWARE_ID_HEADER = "X-Device-Id";

    private final DevicePresenceService devicePresenceService;

    public DeviceAuthenticationFilter(DevicePresenceService devicePresenceService) {
        this.devicePresenceService = devicePresenceService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        String hardwareId = request.getHeader(HARDWARE_ID_HEADER);

        if (header != null && header.startsWith(AUTH_SCHEME) && hardwareId != null && !hardwareId.isBlank()) {
            String secret = header.substring(AUTH_SCHEME.length()).trim();
            Optional<DevicePrincipal> principal = devicePresenceService.authenticate(hardwareId.trim(), secret);
            principal.ifPresent(devicePrincipal -> {
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(new DeviceAuthenticationToken(devicePrincipal));
                SecurityContextHolder.setContext(context);
            });
        }

        filterChain.doFilter(request, response);
    }

    static final class DeviceAuthenticationToken extends AbstractAuthenticationToken {
        private final DevicePrincipal principal;

        DeviceAuthenticationToken(DevicePrincipal principal) {
            super(List.of(new SimpleGrantedAuthority("ROLE_DEVICE")));
            this.principal = principal;
            setAuthenticated(true);
        }

        @Override
        public Object getCredentials() {
            return "";
        }

        @Override
        public Object getPrincipal() {
            return principal;
        }

        @Override
        public String getName() {
            return principal.toString();
        }
    }
}
