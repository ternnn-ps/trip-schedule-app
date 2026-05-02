package com.app.test.migration;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;

@Log4j2
@RestController
@Profile("migration-api")
public class H2ToNeonMigrationController {

    private final DataSource dataSource;
    private final H2ToNeonMigrationService migrationService;

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

    public H2ToNeonMigrationController(DataSource dataSource, H2ToNeonMigrationService migrationService) {
        this.dataSource = dataSource;
        this.migrationService = migrationService;
    }

    @PostMapping("/admin/migrate/h2-to-neon")
    public ResponseEntity<Object> migrate() throws Exception {
        H2ToNeonMigrationService.MigrationOptions options = new H2ToNeonMigrationService.MigrationOptions();
        options.setDropTarget(dropTarget);
        options.setTruncateTarget(truncateTarget);
        options.setTables(tables);

        try (
                Connection h2Connection = dataSource.getConnection();
                Connection neonConnection = DriverManager.getConnection(neonUrl, neonUsername, neonPassword)
        ) {
            H2ToNeonMigrationService.MigrationResult result =
                    migrationService.migrate(h2Connection, neonConnection, options);
            log.info("H2 to Neon migration completed with {} rows.", result.getTotalRows());
            return ResponseEntity.ok(result);
        }
    }
}
