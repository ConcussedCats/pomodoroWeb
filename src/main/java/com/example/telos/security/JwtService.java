package com.example.telos.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey secretKey;
    private final long jwtExpirationInMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expirationInMs}") long jwtExpirationInMs) {
        this.secretKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        this.jwtExpirationInMs = jwtExpirationInMs;
    }

    public String generateToken(String login) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                .subject(login)
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtExpirationInMs))
                .signWith(secretKey)
                .compact();
    }

    public String extractLogin(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String login = extractLogin(token);
        return login.equals(userDetails.getUsername()) && !isExpired(token);
    }

    private boolean isExpired(String token) {
        long now = System.currentTimeMillis();
        return extractAllClaims(token).getExpiration().before(new Date(now));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
