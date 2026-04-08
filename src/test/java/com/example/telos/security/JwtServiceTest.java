package com.example.telos.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Base64;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private static final String VALID_SECRET = Base64.getEncoder()
            .encodeToString("01234567890123456789012345678901".getBytes());

    @Test
    void shouldGenerateTokenWithExpectedSubjectAndClaims() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);

        String token = jwtService.generateToken("user@test.com");
        Claims claims = parseClaims(token, VALID_SECRET);

        assertNotNull(token);
        assertEquals("user@test.com", claims.getSubject());
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
        assertTrue(claims.getExpiration().after(claims.getIssuedAt()));
    }

    @Test
    void shouldExtractLoginFromGeneratedToken() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);

        String token = jwtService.generateToken("user@test.com");

        assertEquals("user@test.com", jwtService.extractLogin(token));
    }

    @Test
    void shouldValidateTokenWhenSubjectMatchesAndTokenIsNotExpired() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);
        UserDetails userDetails = User.withUsername("user@test.com")
                .password("ignored")
                .authorities("ROLE_USER")
                .build();

        String token = jwtService.generateToken("user@test.com");

        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void shouldRejectTokenWhenSubjectDoesNotMatchUserDetails() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);
        UserDetails userDetails = User.withUsername("other@test.com")
                .password("ignored")
                .authorities("ROLE_USER")
                .build();

        String token = jwtService.generateToken("user@test.com");

        assertFalse(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void shouldThrowForExpiredTokenValidation() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);
        UserDetails userDetails = User.withUsername("user@test.com")
                .password("ignored")
                .authorities("ROLE_USER")
                .build();

        long pastTime = System.currentTimeMillis() - 10_000;
        String token = Jwts.builder()
                .subject("user@test.com")
                .issuedAt(new Date(pastTime - 1_000))
                .expiration(new Date(pastTime))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(Base64.getDecoder().decode(VALID_SECRET)))
                .compact();

        assertThrows(ExpiredJwtException.class, () -> jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void shouldFailFastForInvalidBase64Secret() {
        assertThrows(IllegalArgumentException.class, () -> new JwtService("not-base64", 3_600_000));
    }

    @Test
    void shouldRejectTooShortDecodedSecret() {
        String shortSecret = Base64.getEncoder().encodeToString("short-secret".getBytes());

        assertThrows(WeakKeyException.class, () -> new JwtService(shortSecret, 3_600_000));
    }

    @Test
    void shouldThrowForMalformedTokenExtraction() {
        JwtService jwtService = new JwtService(VALID_SECRET, 3_600_000);

        assertThrows(RuntimeException.class, () -> jwtService.extractLogin("definitely-not-a-jwt"));
    }

    private Claims parseClaims(String token, String secret) {
        return Jwts.parser()
                .verifyWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret)))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
