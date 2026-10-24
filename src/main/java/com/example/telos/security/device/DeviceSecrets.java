package com.example.telos.security.device;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Random tokens for pairing and device authentication.
 * Tokens carry 256 bits of entropy, so a plain SHA-256 hash is enough to store them safely
 * (a slow password hash would only make every device request expensive).
 */
public final class DeviceSecrets {
    private static final SecureRandom RANDOM = new SecureRandom();

    private DeviceSecrets() {
    }

    /** 32 random bytes, base64url without padding (43 characters). */
    public static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    /** Constant-time comparison of a presented token with a stored hash. */
    public static boolean matches(String presentedToken, String storedHashHex) {
        if (presentedToken == null || storedHashHex == null) {
            return false;
        }
        byte[] presented = sha256Hex(presentedToken).getBytes(StandardCharsets.US_ASCII);
        byte[] stored = storedHashHex.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(presented, stored);
    }
}
