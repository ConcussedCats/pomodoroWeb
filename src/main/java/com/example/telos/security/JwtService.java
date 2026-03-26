package com.example.telos.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.apache.tomcat.util.net.openssl.ciphers.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
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
}
