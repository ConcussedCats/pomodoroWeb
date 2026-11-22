package com.example.telos.security.device;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class DeviceSecretsTest {
    @Test void createsUniqueUrlSafe256BitTokensAndHashesThem() {
        String first = DeviceSecrets.newToken(); String second = DeviceSecrets.newToken();
        assertThat(first).hasSize(43).matches("[A-Za-z0-9_-]{43}").isNotEqualTo(second);
        assertThat(DeviceSecrets.sha256Hex("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(DeviceSecrets.matches(first, DeviceSecrets.sha256Hex(first))).isTrue();
        assertThat(DeviceSecrets.matches(first, DeviceSecrets.sha256Hex(second))).isFalse();
        assertThat(DeviceSecrets.matches(null, "x")).isFalse();
        assertThat(DeviceSecrets.matches(first, null)).isFalse();
    }
}
