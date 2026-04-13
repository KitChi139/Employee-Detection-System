<?php
header("Content-Type: application/json");
require_once(__DIR__ . "/../config/database.php");

try {
    $sql = "ALTER TABLE events ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 0 AFTER is_archived";
    $conn->exec($sql);
    echo json_encode(["success" => true, "message" => "Column 'is_active' added to 'events' table."]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => "Error adding column: " . $e->getMessage()]);
}
?>