package com.example.telos.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@Getter
public class AppVersionConfig {

    private final String version;

    public AppVersionConfig(ObjectMapper objectMapper) {
        this.version = readVersion(objectMapper);
    }

    public String getVersion() {
        return version;
    }

    private String readVersion(ObjectMapper objectMapper) {
        Path path = Path.of("version.json");

        if (!Files.exists(path)) {
            return "unknown";
        }

        try {
            JsonNode root = objectMapper.readTree(path.toFile());
            JsonNode versionNode = root.get("version");
            return versionNode != null ? versionNode.asText() : "unknown";
        } catch (IOException e) {
            return "unknown";
        }
    }
}