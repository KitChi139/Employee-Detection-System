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
// GET DEPARTMENTS
// ======================================================
if ($method === "GET") {
    try {
        $q1 = "SELECT department_ID, department_name FROM department ORDER BY department_name";
        $stmt = $conn->prepare($q1);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e1) {
        try {
            $q2 = "SELECT department_ID, department_name FROM departments ORDER BY department_name";
            $stmt = $conn->prepare($q2);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
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
// ADD DEPARTMENT
// ======================================================
if ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    $department_name = trim($data["department_name"] ?? "");

    if ($department_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Department name is required"
        ]);
        exit;
    }

    try {
        // Primary schema: department table
        $insert = $conn->prepare("INSERT INTO department (department_name) VALUES (?)");
        $insert->execute([$department_name]);

        echo json_encode([
            "success" => true,
            "message" => "Department added successfully"
        ]);
    } catch (Exception $e1) {
        try {
            // Fallback: departments table
            $insert2 = $conn->prepare("INSERT INTO departments (department_name) VALUES (?)");
            $insert2->execute([$department_name]);

            echo json_encode([
                "success" => true,
                "message" => "Department added successfully"
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
// UPDATE DEPARTMENT
// ======================================================
if ($method === "PUT") {
    $id = $_GET["id"] ?? null;
    $data = json_decode(file_get_contents("php://input"), true);
    $department_name = trim($data["department_name"] ?? "");

    if (!$id || $department_name === "") {
        echo json_encode([
            "error" => true,
            "message" => "Department ID and name are required"
        ]);
        exit;
    }

    try {
        $update = $conn->prepare("UPDATE department SET department_name = ? WHERE department_ID = ?");
        $update->execute([$department_name, $id]);

        echo json_encode([
            "success" => true,
            "message" => "Department updated successfully"
        ]);
    } catch (Exception $e1) {
        try {
            $update2 = $conn->prepare("UPDATE departments SET department_name = ? WHERE department_ID = ?");
            $update2->execute([$department_name, $id]);

            echo json_encode([
                "success" => true,
                "message" => "Department updated successfully"
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
// DELETE DEPARTMENT
// ======================================================
if ($method === "DELETE") {
    $id = $_GET["id"] ?? null;

    if (!$id) {
        echo json_encode([
            "error" => true,
            "message" => "Department ID is required"
        ]);
        exit;
    }

    try {
        $del = $conn->prepare("DELETE FROM department WHERE department_ID = ?");
        $del->execute([$id]);

        echo json_encode([
            "success" => true,
            "message" => "Department removed successfully"
        ]);
    } catch (Exception $e1) {
        try {
            $del2 = $conn->prepare("DELETE FROM departments WHERE department_ID = ?");
            $del2->execute([$id]);

            echo json_encode([
                "success" => true,
                "message" => "Department removed successfully"
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

echo json_encode([
    "error" => true,
    "message" => "Invalid request method"
]);
