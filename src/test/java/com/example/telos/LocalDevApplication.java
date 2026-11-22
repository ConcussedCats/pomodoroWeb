package com.example.telos;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Runs Telos locally with a real embedded PostgreSQL, so no database install or Docker is needed:
 *
 *   ./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.example.telos.LocalDevApplication
 *
 * Data is kept in target/local-postgres until "mvn clean". Flyway creates the schema and the V4 demo users.
 * Only for development: it lives in src/test and is not part of the application jar.
 */
public final class LocalDevApplication {
    private static final int PORT = Integer.getInteger("telos.local.pg.port", 54329);

    private LocalDevApplication() {
    }

    public static void main(String[] args) throws IOException {
        EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                .setPort(PORT)
                .setDataDirectory(Path.of("target", "local-postgres"))
                .setCleanDataDirectory(false)
                .start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                postgres.close();
            } catch (IOException ignored) {
                // shutting down
            }
        }));

        System.setProperty("spring.datasource.url", postgres.getJdbcUrl("postgres", "postgres"));
        System.setProperty("spring.datasource.username", "postgres");
        System.setProperty("spring.datasource.password", "postgres");

        SpringApplication.run(TelosApplication.class, args);
    }
}
