<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once("../config/database.php");

$method = $_SERVER["REQUEST_METHOD"];

// Handle CORS preflight
if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ======================================================
// GET LOCATIONS
// ======================================================
if ($method === "GET") {
    try {
        $query1 = "SELECT location_ID, location_name FROM location ORDER BY location_name";
        $stmt = $conn->prepare($query1);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($rows);
        exit;
    } catch (Exception $e1) {
        try {
            $query2 = "SELECT location_ID, location AS location_name FROM location ORDER BY location";
            $stmt = $conn->prepare($query2);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($rows);
            exit;
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
            exit;
        }
    }
}

// ======================================================
// ADD LOCATION
// ======================================================
if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    $location_name = trim($data["location_name"] ?? "");

    if ($location_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Location name is required"
        ]);
        exit;
    }

    try {
        // Primary schema: location table with location_name
        $insert1 = $conn->prepare("INSERT INTO location (location_name) VALUES (?)");
        $insert1->execute([$location_name]);

        echo json_encode([
            "success" => true,
            "message" => "Location added successfully"
        ]);
    } catch (Exception $e1) {
        try {
            // Fallback: location table with location column
            $insert2 = $conn->prepare("INSERT INTO location (location) VALUES (?)");
            $insert2->execute([$location_name]);

            echo json_encode([
                "success" => true,
                "message" => "Location added successfully"
            ]);
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
        }
    }
    exit;
}

// ======================================================
// UPDATE LOCATION
// ======================================================
if ($method === "PUT") {
    $id = $_GET["id"] ?? null;
    $data = json_decode(file_get_contents("php://input"), true);
    $location_name = trim($data["location_name"] ?? "");

    if (!$id || $location_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Location ID and name are required"
        ]);
        exit;
    }

    try {
        $update1 = $conn->prepare("UPDATE location SET location_name = ? WHERE location_ID = ?");
        $update1->execute([$location_name, $id]);

        echo json_encode([
            "success" => true,
            "message" => "Location updated successfully"
        ]);
    } catch (Exception $e1) {
        try {
            $update2 = $conn->prepare("UPDATE location SET location = ? WHERE location_ID = ?");
            $update2->execute([$location_name, $id]);

            echo json_encode([
                "success" => true,
                "message" => "Location updated successfully"
            ]);
        } catch (Exception $e2) {
            echo json_encode([
                "error" => true,
                "message" => $e2->getMessage()
            ]);
        }
    }
    exit;
}

// ======================================================
// DELETE LOCATION
// ======================================================
if ($method === "DELETE") {
    $id = $_GET["id"] ?? null;

    if (!$id) {
        echo json_encode([
            "error" => true,
            "message" => "Location ID is required"
        ]);
        exit;
    }

    try {
        $del1 = $conn->prepare("DELETE FROM location WHERE location_ID = ?");
        $del1->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Location removed successfully"
        ]);
    } catch (Exception $e1) {
        echo json_encode([
            "error" => true,
            "message" => $e1->getMessage()
        ]);
    }
    exit;
}

echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);
