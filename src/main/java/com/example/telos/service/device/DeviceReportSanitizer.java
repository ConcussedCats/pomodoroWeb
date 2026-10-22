package com.example.telos.service.device;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Keeps only known capability flags and measured metrics from firmware reports,
 * so the website never shows values the hardware did not actually send.
 */
@Component
public class DeviceReportSanitizer {
    public static final Set<String> CAPABILITY_KEYS = Set.of("vibration", "sound", "rgb", "display", "imu");

    private static final Map<String, long[]> METRIC_RANGES = Map.of(
            "wifiRssi", new long[]{-127, 0},
            "uptimeSeconds", new long[]{0, 10L * 365 * 24 * 3600},
            "freeHeapBytes", new long[]{0, 64L * 1024 * 1024}
    );

    private final ObjectMapper objectMapper;

    public DeviceReportSanitizer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Boolean> capabilities(Map<String, Object> reported) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        if (reported == null) {
            return result;
        }
        for (String key : CAPABILITY_KEYS.stream().sorted().toList()) {
            if (reported.get(key) instanceof Boolean value) {
                result.put(key, value);
            }
        }
        return result;
    }

    public Map<String, Number> metrics(Map<String, Object> reported) {
        Map<String, Number> result = new LinkedHashMap<>();
        if (reported == null) {
            return result;
        }
        METRIC_RANGES.keySet().stream().sorted().forEach(key -> {
            if (reported.get(key) instanceof Number number && !(number instanceof Double || number instanceof Float)) {
                long value = number.longValue();
                long[] range = METRIC_RANGES.get(key);
                if (value >= range[0] && value <= range[1]) {
                    result.put(key, value);
                }
            }
        });
        return result;
    }

    public String toJson(Map<String, ?> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }

    public Map<String, Boolean> readCapabilities(String json) {
        return read(json, new TypeReference<>() {
        });
    }

    public Map<String, Number> readMetrics(String json) {
        return read(json, new TypeReference<>() {
        });
    }

    private <T> Map<String, T> read(String json, TypeReference<Map<String, T>> type) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException exception) {
            return new LinkedHashMap<>();
        }
    }
}
