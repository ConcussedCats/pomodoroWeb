package com.example.telos.validation;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("negative")
class Forbidden67PolicyTest {

    @Test
    void shouldRejectExactNumeric67Token() {
        assertTrue(Forbidden67Policy.containsForbiddenToken("67"));
        assertTrue(Forbidden67Policy.containsForbiddenToken(" 67 "));
    }

    @Test
    void shouldRejectExactSixSevenTokenCaseInsensitively() {
        assertTrue(Forbidden67Policy.containsForbiddenToken("six seven"));
        assertTrue(Forbidden67Policy.containsForbiddenToken(" Six   Seven "));
    }

    @Test
    void shouldAllowOtherValues() {
        assertFalse(Forbidden67Policy.containsForbiddenToken("demo-user"));
        assertFalse(Forbidden67Policy.containsForbiddenToken("167"));
        assertFalse(Forbidden67Policy.containsForbiddenToken("sixty seven"));
        assertFalse(Forbidden67Policy.containsForbiddenToken(null));
    }
}
