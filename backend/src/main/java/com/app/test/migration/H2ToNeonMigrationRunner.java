package com.app.test.migration;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;

@Log4j2
@Component
@Profile("migrate-h2-to-neon")
public class H2ToNeonMigrationRunner implements CommandLineRunner {

    private final H2ToNeonMigrationService migrationService;

    @Value("${migration.h2.url}")
    private String h2Url;

    @Value("${migration.h2.username:sa}")
    private String h2Username;

    @Value("${migration.h2.password:}")
    private String h2Password;

    @Value("${migration.neon.url}")
    private String neonUrl;

    @Value("${migration.neon.username}")
    private String neonUsername;

    @Value("${migration.neon.password}")
    private String neonPassword;

    @Value("${migration.drop-target:false}")
    private boolean dropTarget;

    @Value("${migration.truncate-target:false}")
    private boolean truncateTarget;

    @Value("${migration.tables:}")
    private String tables;

    public H2ToNeonMigrationRunner(H2ToNeonMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    @Override
    public void run(String... args) throws Exception {
        H2ToNeonMigrationService.MigrationOptions options = new H2ToNeonMigrationService.MigrationOptions();
        options.setDropTarget(dropTarget);
        options.setTruncateTarget(truncateTarget);
        options.setTables(tables);

        try (
                Connection h2Connection = DriverManager.getConnection(h2Url, h2Username, h2Password);
                Connection neonConnection = DriverManager.getConnection(neonUrl, neonUsername, neonPassword)
        ) {
            H2ToNeonMigrationService.MigrationResult result =
                    migrationService.migrate(h2Connection, neonConnection, options);

            log.info(result.getMessage());
            result.getRowsByTable().forEach((table, rows) -> log.info("{} -> {} rows", table, rows));
            log.info("Total migrated rows: {}", result.getTotalRows());
        }
    }
}
