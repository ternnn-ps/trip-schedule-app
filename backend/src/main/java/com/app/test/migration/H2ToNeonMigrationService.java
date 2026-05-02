package com.app.test.migration;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;

@Service
public class H2ToNeonMigrationService {

    public MigrationResult migrate(Connection sourceConnection, Connection targetConnection, MigrationOptions options)
            throws SQLException {
        List<TableDefinition> tables = loadTables(sourceConnection, options.getTables());
        MigrationResult result = new MigrationResult();

        if (tables.isEmpty()) {
            result.setMessage("No H2 tables found to migrate.");
            return result;
        }

        boolean originalAutoCommit = targetConnection.getAutoCommit();
        targetConnection.setAutoCommit(false);

        try {
            if (options.isDropTarget()) {
                dropTargetTables(targetConnection, tables);
            }

            for (TableDefinition table : tables) {
                createTargetTable(targetConnection, table);
            }

            if (options.isTruncateTarget()) {
                truncateTargetTables(targetConnection, tables);
            }

            for (TableDefinition table : tables) {
                long copiedRows = copyTableData(sourceConnection, targetConnection, table);
                result.getRowsByTable().put(table.getTargetName(), copiedRows);
                result.setTotalRows(result.getTotalRows() + copiedRows);
            }

            for (TableDefinition table : tables) {
                resetIdentityColumns(targetConnection, table);
            }

            targetConnection.commit();
            result.setMessage("Migration completed.");
            return result;
        } catch (SQLException ex) {
            targetConnection.rollback();
            throw ex;
        } finally {
            targetConnection.setAutoCommit(originalAutoCommit);
        }
    }

    private List<TableDefinition> loadTables(Connection connection, String requestedTables) throws SQLException {
        Set<String> requested = parseRequestedTables(requestedTables);
        DatabaseMetaData metaData = connection.getMetaData();
        List<TableDefinition> tables = new ArrayList<>();

        try (ResultSet tableRows = metaData.getTables(null, "PUBLIC", "%", new String[]{"TABLE"})) {
            while (tableRows.next()) {
                String tableName = tableRows.getString("TABLE_NAME");

                if (tableName == null || tableName.startsWith("SYS") || tableName.startsWith("INFORMATION_SCHEMA")) {
                    continue;
                }

                if (!requested.isEmpty() && !requested.contains(tableName.toLowerCase(Locale.ROOT))) {
                    continue;
                }

                TableDefinition table = new TableDefinition();
                table.setSourceName(tableName);
                table.setTargetName(tableName.toLowerCase(Locale.ROOT));
                table.setColumns(loadColumns(metaData, tableName));
                table.setPrimaryKeys(loadPrimaryKeys(metaData, tableName));
                tables.add(table);
            }
        }

        tables.sort(Comparator.comparing(TableDefinition::getTargetName));
        return tables;
    }

    private List<ColumnDefinition> loadColumns(DatabaseMetaData metaData, String tableName) throws SQLException {
        List<ColumnDefinition> columns = new ArrayList<>();

        try (ResultSet columnRows = metaData.getColumns(null, "PUBLIC", tableName, "%")) {
            while (columnRows.next()) {
                ColumnDefinition column = new ColumnDefinition();
                String sourceName = columnRows.getString("COLUMN_NAME");
                column.setSourceName(sourceName);
                column.setTargetName(sourceName.toLowerCase(Locale.ROOT));
                column.setJdbcType(columnRows.getInt("DATA_TYPE"));
                column.setTypeName(columnRows.getString("TYPE_NAME"));
                column.setColumnSize(columnRows.getInt("COLUMN_SIZE"));
                column.setDecimalDigits(columnRows.getInt("DECIMAL_DIGITS"));
                column.setNullable(columnRows.getInt("NULLABLE") == DatabaseMetaData.columnNullable);
                column.setAutoIncrement("YES".equalsIgnoreCase(columnRows.getString("IS_AUTOINCREMENT")));
                columns.add(column);
            }
        }

        return columns;
    }

    private Set<String> loadPrimaryKeys(DatabaseMetaData metaData, String tableName) throws SQLException {
        Set<String> primaryKeys = new HashSet<>();

        try (ResultSet primaryKeyRows = metaData.getPrimaryKeys(null, "PUBLIC", tableName)) {
            while (primaryKeyRows.next()) {
                primaryKeys.add(primaryKeyRows.getString("COLUMN_NAME").toLowerCase(Locale.ROOT));
            }
        }

        return primaryKeys;
    }

    private void dropTargetTables(Connection connection, List<TableDefinition> tables) throws SQLException {
        List<TableDefinition> reversedTables = new ArrayList<>(tables);
        Collections.reverse(reversedTables);

        try (Statement statement = connection.createStatement()) {
            for (TableDefinition table : reversedTables) {
                statement.executeUpdate("DROP TABLE IF EXISTS " + quote(table.getTargetName()) + " CASCADE");
            }
        }
    }

    private void createTargetTable(Connection connection, TableDefinition table) throws SQLException {
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS ").append(quote(table.getTargetName())).append(" (");

        List<String> definitions = new ArrayList<>();
        for (ColumnDefinition column : table.getColumns()) {
            StringBuilder definition = new StringBuilder();
            definition.append(quote(column.getTargetName())).append(" ").append(toPostgresType(column));

            if (!column.isNullable() || table.getPrimaryKeys().contains(column.getTargetName())) {
                definition.append(" NOT NULL");
            }

            definitions.add(definition.toString());
        }

        if (!table.getPrimaryKeys().isEmpty()) {
            List<String> primaryKeys = new ArrayList<>();
            for (String primaryKey : table.getPrimaryKeys()) {
                primaryKeys.add(quote(primaryKey));
            }
            definitions.add("PRIMARY KEY (" + String.join(", ", primaryKeys) + ")");
        }

        sql.append(String.join(", ", definitions));
        sql.append(")");

        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql.toString());
        }
    }

    private void truncateTargetTables(Connection connection, List<TableDefinition> tables) throws SQLException {
        List<String> tableNames = new ArrayList<>();

        for (TableDefinition table : tables) {
            tableNames.add(quote(table.getTargetName()));
        }

        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("TRUNCATE TABLE " + String.join(", ", tableNames) + " RESTART IDENTITY CASCADE");
        }
    }

    private long copyTableData(Connection sourceConnection, Connection targetConnection, TableDefinition table)
            throws SQLException {
        if (table.getColumns().isEmpty()) {
            return 0;
        }

        List<String> sourceColumns = new ArrayList<>();
        List<String> targetColumns = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();

        for (ColumnDefinition column : table.getColumns()) {
            sourceColumns.add(quoteSource(column.getSourceName()));
            targetColumns.add(quote(column.getTargetName()));
            placeholders.add("?");
        }

        String selectSql = "SELECT " + String.join(", ", sourceColumns) + " FROM " + quoteSource(table.getSourceName());
        String insertSql = "INSERT INTO " + quote(table.getTargetName()) +
                " (" + String.join(", ", targetColumns) + ") VALUES (" + String.join(", ", placeholders) + ")";

        long copiedRows = 0;

        try (
                Statement selectStatement = sourceConnection.createStatement();
                ResultSet rows = selectStatement.executeQuery(selectSql);
                PreparedStatement insertStatement = targetConnection.prepareStatement(insertSql)
        ) {
            int batchSize = 0;

            while (rows.next()) {
                for (int index = 0; index < table.getColumns().size(); index++) {
                    insertStatement.setObject(index + 1, rows.getObject(index + 1));
                }

                insertStatement.addBatch();
                copiedRows++;
                batchSize++;

                if (batchSize >= 500) {
                    insertStatement.executeBatch();
                    batchSize = 0;
                }
            }

            if (batchSize > 0) {
                insertStatement.executeBatch();
            }
        }

        return copiedRows;
    }

    private void resetIdentityColumns(Connection connection, TableDefinition table) {
        for (ColumnDefinition column : table.getColumns()) {
            if (!column.isAutoIncrement()) {
                continue;
            }

            String sql = "SELECT setval(pg_get_serial_sequence('" + table.getTargetName() + "', '" +
                    column.getTargetName() + "'), COALESCE((SELECT MAX(" + quote(column.getTargetName()) +
                    ") FROM " + quote(table.getTargetName()) + "), 0) + 1, false)";

            try (Statement statement = connection.createStatement()) {
                statement.execute(sql);
            } catch (SQLException ignored) {
                // Existing Neon tables may not use a serial/identity sequence. Data copy still succeeded.
            }
        }
    }

    private String toPostgresType(ColumnDefinition column) {
        if (column.isAutoIncrement() && isIntegerType(column.getJdbcType())) {
            return column.getJdbcType() == Types.BIGINT
                    ? "bigint GENERATED BY DEFAULT AS IDENTITY"
                    : "integer GENERATED BY DEFAULT AS IDENTITY";
        }

        switch (column.getJdbcType()) {
            case Types.BIGINT:
                return "bigint";
            case Types.INTEGER:
                return "integer";
            case Types.SMALLINT:
            case Types.TINYINT:
                return "smallint";
            case Types.FLOAT:
            case Types.REAL:
                return "real";
            case Types.DOUBLE:
                return "double precision";
            case Types.NUMERIC:
            case Types.DECIMAL:
                if (column.getColumnSize() > 0) {
                    return "numeric(" + column.getColumnSize() + ", " + Math.max(column.getDecimalDigits(), 0) + ")";
                }
                return "numeric";
            case Types.CHAR:
            case Types.NCHAR:
                return "char(" + Math.max(column.getColumnSize(), 1) + ")";
            case Types.VARCHAR:
            case Types.NVARCHAR:
                if (column.getColumnSize() > 0 && column.getColumnSize() <= 4000) {
                    return "varchar(" + column.getColumnSize() + ")";
                }
                return "text";
            case Types.LONGVARCHAR:
            case Types.LONGNVARCHAR:
            case Types.CLOB:
            case Types.NCLOB:
                return "text";
            case Types.BOOLEAN:
            case Types.BIT:
                return "boolean";
            case Types.DATE:
                return "date";
            case Types.TIME:
            case Types.TIME_WITH_TIMEZONE:
                return "time";
            case Types.TIMESTAMP:
            case Types.TIMESTAMP_WITH_TIMEZONE:
                return "timestamp";
            case Types.BINARY:
            case Types.VARBINARY:
            case Types.LONGVARBINARY:
            case Types.BLOB:
                return "bytea";
            default:
                return "text";
        }
    }

    private boolean isIntegerType(int jdbcType) {
        return jdbcType == Types.BIGINT || jdbcType == Types.INTEGER ||
                jdbcType == Types.SMALLINT || jdbcType == Types.TINYINT;
    }

    private Set<String> parseRequestedTables(String requestedTables) {
        Set<String> tables = new HashSet<>();

        if (requestedTables == null || requestedTables.trim().isEmpty()) {
            return tables;
        }

        for (String table : requestedTables.split(",")) {
            if (!table.trim().isEmpty()) {
                tables.add(table.trim().toLowerCase(Locale.ROOT));
            }
        }

        return tables;
    }

    private String quote(String identifier) {
        return "\"" + identifier.toLowerCase(Locale.ROOT).replace("\"", "\"\"") + "\"";
    }

    private String quoteSource(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    @Data
    public static class MigrationOptions {
        private boolean dropTarget;
        private boolean truncateTarget;
        private String tables;
    }

    @Data
    public static class MigrationResult {
        private String message;
        private long totalRows;
        private Map<String, Long> rowsByTable = new LinkedHashMap<>();
    }

    @Data
    private static class TableDefinition {
        private String sourceName;
        private String targetName;
        private List<ColumnDefinition> columns = new ArrayList<>();
        private Set<String> primaryKeys = new HashSet<>();
    }

    @Data
    private static class ColumnDefinition {
        private String sourceName;
        private String targetName;
        private int jdbcType;
        private String typeName;
        private int columnSize;
        private int decimalDigits;
        private boolean nullable;
        private boolean autoIncrement;
    }
}
